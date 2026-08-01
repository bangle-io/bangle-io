import type { EditorView } from '@bangle.io/prosemirror-plugins';
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
  payload:
    | {
        type: 'file-create' | 'file-content-update' | 'file-delete';
        wsPath: string;
      }
    | { type: 'refresh'; wsName?: string },
): ExternalFileChangeEvent {
  return { sequence: 1, ...payload };
}

/**
 * Minimal stand-in for a mounted view. The sync only ever touches these
 * fields, so the single cast lives here instead of at every call site.
 */
function fakeView({
  composing = false,
  isDestroyed = false,
}: {
  composing?: boolean;
  isDestroyed?: boolean;
} = {}): EditorView {
  return {
    composing,
    isDestroyed,
    state: { doc: {}, schema: {} },
  } as unknown as EditorView;
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
    getRetainedSource: vi.fn(() => undefined),
    replaceContent: vi.fn(async (): Promise<'applied'> => 'applied'),
    onStaleContentRefused: vi.fn(),
    onContentReconciled: vi.fn(),
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
      wsPath === 'ws:open.md' ? [fakeView()] : [],
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
    // Deletes never reconcile content.
    sync.handleEvent(makeEvent({ type: 'file-delete', wsPath: 'ws:open.md' }));

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
      getViews: vi.fn(() => [fakeView()]),
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

  it('gives up on never-stable content instead of spinning forever', async () => {
    let reads = 0;
    const host = makeHost({
      getViews: vi.fn(() => [fakeView()]),
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

    // How many passes it takes is tuning; the contract is that the loop ends,
    // says so, and never applies content it could not confirm.
    await waitUntil(
      () =>
        vi
          .mocked(host.logger.warn)
          .mock.calls.some(([message]) =>
            String(message).includes('could not be reconciled'),
          ),
      15_000,
    );
    const readsAtGiveUp = reads;
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(reads).toBe(readsAtGiveUp);
    expect(host.replaceContent).not.toHaveBeenCalled();
    // Giving up leaves the editor knowingly behind disk — the user must get
    // the stale-content surface, not only a console warning.
    expect(host.onStaleContentRefused).toHaveBeenCalledWith('ws:a.md');
  }, 20_000);

  it('reconciles content that only settles after the fast passes', async () => {
    let reads = 0;
    const host = makeHost({
      // A destroyed view keeps the pass from reaching content application
      // while still exercising the full read protocol.
      getViews: vi.fn(() => [fakeView({ isDestroyed: true })]),
      readFileAsText: vi.fn(async () => {
        reads += 1;
        // Unstable for longer than the back-to-back passes, so only the
        // post-backoff passes can see two agreeing reads.
        return reads <= 10 ? `content-${reads}` : 'settled';
      }),
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );

    // The trailing passes settle it rather than silently dropping the work.
    await waitUntil(() => reads > 10, 10_000);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(host.logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('could not be reconciled'),
    );
    expect(host.onStaleContentRefused).not.toHaveBeenCalled();
  }, 15_000);

  it('a view busy with IME composition is never replaced; the pass retries', async () => {
    let reads = 0;
    const view = fakeView({ composing: true });
    const host = makeHost({
      getViews: vi.fn(() => [view]),
      readFileAsText: vi.fn(async () => {
        reads += 1;
        return 'stable external content';
      }),
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );

    // Stable reads but a composing view: the pass keeps retrying (bounded)
    // instead of dispatching into the live composition.
    await waitUntil(() => reads >= 4, 10_000);
    expect(host.replaceContent).not.toHaveBeenCalled();
    expect(host.getMarkdown).not.toHaveBeenCalled();
  });
});

describe('refusal and reconciliation reporting', () => {
  it('an unparseable external change is refused and reported to the host', async () => {
    const view = fakeView();
    const host = makeHost({
      getViews: vi.fn(() => [view]),
      getMarkdown: vi.fn(
        () =>
          ({
            parser: {
              parse: () => {
                throw new Error('cannot parse');
              },
            },
            serializer: { serialize: () => 'unused' },
          }) as never,
      ),
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );

    await waitUntil(
      () => vi.mocked(host.onStaleContentRefused).mock.calls.length > 0,
    );
    expect(host.onStaleContentRefused).toHaveBeenCalledWith('ws:a.md');
    expect(host.onContentReconciled).not.toHaveBeenCalled();
    expect(host.replaceContent).not.toHaveBeenCalled();
  });

  it('an echo (serializer-equal content) reports reconciliation, clearing stale notices', async () => {
    const view = fakeView();
    const host = makeHost({
      getViews: vi.fn(() => [view]),
      readFileAsText: vi.fn(async () => 'same output'),
      getMarkdown: vi.fn(
        () =>
          ({
            parser: { parse: () => ({}) },
            // Editor doc and disk content serialize identically → echo.
            serializer: { serialize: () => 'same output' },
          }) as never,
      ),
    });
    const sync = new ExternalContentSync(host);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );

    await waitUntil(
      () => vi.mocked(host.onContentReconciled).mock.calls.length > 0,
    );
    expect(host.onContentReconciled).toHaveBeenCalledWith('ws:a.md');
    expect(host.onStaleContentRefused).not.toHaveBeenCalled();
    expect(host.replaceContent).not.toHaveBeenCalled();
  });
});

describe('user-approved disk version', () => {
  it('keeps edits that become pending while disk is being read', async () => {
    const view = fakeView();
    const host = makeHost({
      getViews: vi.fn(() => [view]),
      hasPendingSaves: vi.fn().mockReturnValueOnce(false).mockReturnValue(true),
    });
    const sync = new ExternalContentSync(host);

    await sync.acceptDiskVersion('ws:a.md');

    expect(host.readFileAsText).toHaveBeenCalledTimes(1);
    expect(host.getMarkdown).not.toHaveBeenCalled();
    expect(host.replaceContent).not.toHaveBeenCalled();
  });
});

describe('abort', () => {
  it('an aborted signal stops in-flight passes without further reads', async () => {
    let reads = 0;
    const controller = new AbortController();
    const host = makeHost({
      getViews: vi.fn(() => [fakeView()]),
      readFileAsText: vi.fn(async () => {
        reads += 1;
        return `content-${reads}`;
      }),
    });
    const sync = new ExternalContentSync(host, controller.signal);

    sync.handleEvent(
      makeEvent({ type: 'file-content-update', wsPath: 'ws:a.md' }),
    );
    // Abort while the first pass sleeps through its quiet period.
    controller.abort();

    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(reads).toBe(0);
  });
});
