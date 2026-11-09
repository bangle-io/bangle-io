import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForSaveQueueToDrain } from '../editor-save-status';

describe('waitForSaveQueueToDrain', () => {
  function makeEngine(initiallyDirty: boolean) {
    let dirty = initiallyDirty;
    const listeners = new Set<() => void>();
    const checkedWsPaths: Array<string | undefined> = [];
    const subscribedWsPaths: Array<string | undefined> = [];
    return {
      hasPendingOrFailedSave: (wsPath?: string) => {
        checkedWsPaths.push(wsPath);
        return dirty;
      },
      subscribeToSaveStatus: (listener: () => void, wsPath?: string) => {
        subscribedWsPaths.push(wsPath);
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      setDirty(next: boolean) {
        dirty = next;
        for (const listener of listeners) {
          listener();
        }
      },
      checkedWsPaths,
      subscribedWsPaths,
      listenerCount: () => listeners.size,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves true immediately when nothing is pending', async () => {
    const engine = makeEngine(false);
    await expect(waitForSaveQueueToDrain(engine, 1000)).resolves.toBe(true);
    expect(engine.listenerCount()).toBe(0);
  });

  it('resolves true once the queue drains and unsubscribes', async () => {
    const engine = makeEngine(true);
    const result = waitForSaveQueueToDrain(engine, 1000);

    engine.setDirty(false);

    await expect(result).resolves.toBe(true);
    expect(engine.listenerCount()).toBe(0);
  });

  it('resolves false when a save is still pending or failed at the timeout', async () => {
    const engine = makeEngine(true);
    const result = waitForSaveQueueToDrain(engine, 1000);

    vi.advanceTimersByTime(1000);

    await expect(result).resolves.toBe(false);
    expect(engine.listenerCount()).toBe(0);
  });

  it('ignores notifications that leave the queue dirty', async () => {
    const engine = makeEngine(true);
    const result = waitForSaveQueueToDrain(engine, 1000);

    engine.setDirty(true);
    vi.advanceTimersByTime(1000);

    await expect(result).resolves.toBe(false);
  });

  it('scopes every dirty-state check to one file when requested', async () => {
    const engine = makeEngine(true);
    const result = waitForSaveQueueToDrain(engine, 1000, 'notes:source.md');

    engine.setDirty(false);

    await expect(result).resolves.toBe(true);
    expect(engine.checkedWsPaths).not.toContain(undefined);
    expect(engine.checkedWsPaths.length).toBeGreaterThanOrEqual(2);
    expect(
      engine.checkedWsPaths.every((wsPath) => wsPath === 'notes:source.md'),
    ).toBe(true);
    expect(engine.subscribedWsPaths).toEqual(['notes:source.md']);
  });
});
