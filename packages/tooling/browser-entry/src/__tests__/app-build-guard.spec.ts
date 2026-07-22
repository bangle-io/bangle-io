import { MemoryBroadcastChannel } from '@bangle.io/browser-utils';
import { Logger } from '@bangle.io/logger';
import { describe, expect, it, vi } from 'vitest';
import { type AppBuildIdentity, setupAppBuildGuard } from '../app-build-guard';
import { setupRootEmitter } from '../setup-root-emitter';

vi.stubGlobal('BroadcastChannel', MemoryBroadcastChannel);

let testId = 0;

function setupTab(channelName: string, appBuild: AppBuildIdentity) {
  const abortController = new AbortController();
  const tabId = `tab-${testId++}`;
  const logger = new Logger(tabId);
  const rootEmitter = setupRootEmitter(
    channelName,
    tabId,
    logger,
    abortController.signal,
  );
  const onStale = vi.fn();
  rootEmitter.on('event::app:stale-tab', onStale, abortController.signal);

  return {
    guard: setupAppBuildGuard({
      rootEmitter,
      appBuild,
      tabId,
      logger,
      abortSignal: abortController.signal,
    }),
    onStale,
  };
}

const OLDER_BUILD = {
  id: 'older-build',
  builtAt: '2026-07-20T12:00:00.000Z',
} satisfies AppBuildIdentity;
const NEWER_BUILD = {
  id: 'newer-build',
  builtAt: '2026-07-21T12:00:00.000Z',
} satisfies AppBuildIdentity;

describe('app build guard', () => {
  it('marks only the older running tab stale', () => {
    const channelName = `build-order-${testId}`;
    const older = setupTab(channelName, OLDER_BUILD);
    const newer = setupTab(channelName, NEWER_BUILD);

    older.guard.start();
    newer.guard.start();

    expect(older.onStale).toHaveBeenCalledTimes(1);
    expect(newer.onStale).not.toHaveBeenCalled();
  });

  it('discovers a newer build that was already running', () => {
    const channelName = `late-older-${testId}`;
    const newer = setupTab(channelName, NEWER_BUILD);
    newer.guard.start();
    const older = setupTab(channelName, OLDER_BUILD);

    older.guard.start();

    expect(older.onStale).toHaveBeenCalledTimes(1);
    expect(newer.onStale).not.toHaveBeenCalled();
  });

  it('waits for explicit start and ignores matching builds', () => {
    const channelName = `startup-order-${testId}`;
    const older = setupTab(channelName, OLDER_BUILD);
    const newer = setupTab(channelName, NEWER_BUILD);

    newer.guard.start();
    expect(older.onStale).not.toHaveBeenCalled();

    const matching = setupTab(channelName, NEWER_BUILD);
    matching.guard.start();
    expect(matching.onStale).not.toHaveBeenCalled();

    older.guard.start();
    expect(older.onStale).toHaveBeenCalledTimes(1);
  });

  it('uses build id as a deterministic tie-break for equal timestamps', () => {
    const channelName = `build-tie-${testId}`;
    const lower = setupTab(channelName, {
      id: 'build-a',
      builtAt: OLDER_BUILD.builtAt,
    });
    const higher = setupTab(channelName, {
      id: 'build-b',
      builtAt: OLDER_BUILD.builtAt,
    });

    lower.guard.start();
    higher.guard.start();

    expect(lower.onStale).toHaveBeenCalledTimes(1);
    expect(higher.onStale).not.toHaveBeenCalled();
  });
});
