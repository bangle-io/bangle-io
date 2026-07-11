import type { ExternalFileChangeEvent } from '@bangle.io/service-core';
import { describe, expect, it, vi } from 'vitest';
import {
  ExternalContentSync,
  type ExternalContentSyncHost,
} from '../external-content-sync';

/**
 * Lifecycle-focused tests against a fake host: sequencing, coalescing, read
 * stability, and target selection. Content application against real
 * ProseMirror views is covered by external-change-sync.spec.ts through the
 * full service wiring.
 */

function makeEvent(
  partial: Partial<ExternalFileChangeEvent> &
    Pick<ExternalFileChangeEvent, 'type'>,
): ExternalFileChangeEvent {
  return { sequence: 1, ...partial };
}

function makeHost(overrides: Partial<ExternalContentSyncHost> = {}) {
  const host: ExternalContentSyncHost = {
    // A non-empty views list keeps passes running to the read stage; content
    // application is exercised in the integration spec.
    getViews: vi.fn(() => []),
    getMountedWsPaths: vi.fn(() => []),
    hasPendingSaves: vi.fn(() => false),
    readFileAsText: vi.fn(async () => 'stable content'),
    getMarkdown: vi.fn(() => {
      throw new Error('not needed in these tests');
    }),
    withSaveSuppressed: vi.fn((_wsPath, dispatch) => dispatch()),
    logger: { warn: vi.fn(), error: vi.fn() },
    ...overrides,
  };
  return host;
}

async function waitUntil(check: () => boolean, timeoutMs = 5_000) {
  await vi.waitFor(
    () => {
      expect(check()).toBe(true);
    },
    { timeout: timeoutMs },
  );
}

describe('target selection', () => {
  it('content updates target only mounted editors for that exact path', () => {
    const getViews = vi.fn((wsPath: string) =>
      wsPath === 'ws:open.md' ? [{} as never] : [],
    );
    const host = makeHost({
      getViews,
      // Force syncPath to bail immediately after selection.
      hasPendingSaves: vi.fn(() => true),
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:closed.md' }),
    );
    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:open.md' }),
    );
    // Deletes and renames never reconcile content.
    sync.handleEvent(makeEvent({ type: 'file-delete', wsPath: 'ws:open.md' }));
    sync.handleEvent(makeEvent({ type: 'file-rename', wsPath: 'ws:open.md' }));

    expect(getViews).toHaveBeenCalledWith('ws:closed.md');
    expect(getViews).toHaveBeenCalledWith('ws:open.md');
    // Only the open path progressed into a sync pass (checked via the
    // dirty-guard probe that runs first in a pass).
    expect(host.hasPendingSaves).toHaveBeenCalledTimes(1);
    expect(host.hasPendingSaves).toHaveBeenCalledWith('ws:open.md');
  });

  it('scoped refreshes ask only for that workspace; app-wide for all', () => {
    const getMountedWsPaths = vi.fn(() => []);
    const sync = new ExternalContentSync(makeHost({ getMountedWsPaths }));

    sync.handleEvent(makeEvent({ type: 'refresh', wsName: 'ws-a' }));
    expect(getMountedWsPaths).toHaveBeenLastCalledWith('ws-a');

    sync.handleEvent(makeEvent({ type: 'refresh' }));
    expect(getMountedWsPaths).toHaveBeenLastCalledWith(undefined);
  });
});

describe('coalescing and stability', () => {
  it('events during an in-flight pass coalesce into exactly one more pass', async () => {
    let passes = 0;
    const host = makeHost({
      // Non-empty so the pass reaches the reads (and thus takes time).
      getViews: vi.fn(() => [{ state: { doc: {} } } as never]),
      readFileAsText: vi.fn(async () => {
        passes += 1;
        return 'same';
      }),
      // Bail right after the stable reads, before content application.
      hasPendingSaves: vi
        .fn()
        .mockReturnValueOnce(false) // pass 1 entry
        .mockReturnValue(true), // post-read checks and later passes
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );
    // Three more events arrive while the first pass sleeps through its quiet
    // period — they must coalesce into a single rerun, not three.
    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );
    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );
    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );

    // Pass 1 reads twice; the coalesced rerun bails at its dirty check
    // without reading again.
    await waitUntil(() => passes === 2);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(passes).toBe(2);
  });

  it('disagreeing reads rerun the pass until stable, bounded per burst', async () => {
    let reads = 0;
    const host = makeHost({
      getViews: vi.fn(() => [{ state: { doc: {} } } as never]),
      // Every read returns something different: never stable.
      readFileAsText: vi.fn(async () => {
        reads += 1;
        return `content-${reads}`;
      }),
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );

    // MAX_PASSES = 5 → exactly 10 reads, then the burst gives up.
    await waitUntil(() => reads === 10, 10_000);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(reads).toBe(10);
    // Nothing was ever applied.
    expect(host.withSaveSuppressed).not.toHaveBeenCalled();
  });
});
