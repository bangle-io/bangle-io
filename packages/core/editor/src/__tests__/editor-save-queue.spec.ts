import { type BaseError, getAppErrorCause } from '@bangle.io/base-utils';
import { describe, expect, it, vi } from 'vitest';
import {
  createEditorSaveQueueStore,
  EditorSaveQueue,
} from '../editor-save-queue';

type Deferred<T> = {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve: Deferred<T>['resolve'] | undefined;
  let reject: Deferred<T>['reject'] | undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  if (!resolve || !reject) {
    throw new Error('Unable to create deferred promise');
  }

  return { promise, reject, resolve };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function getFirstEmittedAppError(
  emitAppError: ReturnType<typeof vi.fn<(error: BaseError) => void>>,
) {
  const emittedError = emitAppError.mock.calls[0]?.[0];
  if (!emittedError) {
    throw new Error('Expected an emitted app error');
  }

  return getAppErrorCause(emittedError);
}

describe('EditorSaveQueue', () => {
  it('notifies subscribers as protection becomes dirty and clean', async () => {
    const write = createDeferred<void>();
    const listener = vi.fn();
    const queue = new EditorSaveQueue(() => write.promise, vi.fn());
    const unsubscribe = queue.subscribe(listener);

    queue.enqueue('workspace:note.md', 'latest');
    expect(queue.hasPendingOrFailed()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    write.resolve();
    await vi.waitFor(() => {
      expect(queue.hasPendingOrFailed()).toBe(false);
    });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    queue.enqueue('workspace:note.md', 'newer');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('serializes writes and coalesces rapid edits to the latest pending doc', async () => {
    const firstWrite = createDeferred<void>();
    const writes: Array<{ doc: string; wsPath: string }> = [];
    const writer = vi.fn((wsPath: string, doc: string) => {
      writes.push({ doc, wsPath });
      return writes.length === 1 ? firstWrite.promise : Promise.resolve();
    });
    const emitAppError = vi.fn();
    const queue = new EditorSaveQueue(writer, emitAppError);

    queue.enqueue('workspace:note.md', 'first');
    queue.enqueue('workspace:note.md', 'second');
    queue.enqueue('workspace:note.md', 'third');

    expect(writes).toEqual([{ doc: 'first', wsPath: 'workspace:note.md' }]);
    expect(queue.getStatus('workspace:note.md')).toEqual({
      status: 'pending',
    });

    firstWrite.resolve();
    await flushMicrotasks();

    expect(writes).toEqual([
      { doc: 'first', wsPath: 'workspace:note.md' },
      { doc: 'third', wsPath: 'workspace:note.md' },
    ]);
    expect(emitAppError).not.toHaveBeenCalled();
    expect(queue.getStatus('workspace:note.md')).toEqual({ status: 'clean' });
  });

  it('allows writes for different wsPaths to run independently', async () => {
    const firstWrite = createDeferred<void>();
    const writes: Array<{ doc: string; wsPath: string }> = [];
    const writer = vi.fn((wsPath: string, doc: string) => {
      writes.push({ doc, wsPath });
      return wsPath === 'workspace:first.md'
        ? firstWrite.promise
        : Promise.resolve();
    });
    const queue = new EditorSaveQueue(writer, vi.fn());

    queue.enqueue('workspace:first.md', 'first note');
    queue.enqueue('workspace:second.md', 'second note');
    await flushMicrotasks();

    expect(writes).toEqual([
      { doc: 'first note', wsPath: 'workspace:first.md' },
      { doc: 'second note', wsPath: 'workspace:second.md' },
    ]);
    expect(queue.getStatus('workspace:first.md')).toEqual({
      status: 'pending',
    });
    expect(queue.hasPendingOrFailed('workspace:first.md')).toBe(true);
    expect(queue.getStatus('workspace:second.md')).toEqual({
      status: 'clean',
    });
    expect(queue.hasPendingOrFailed('workspace:second.md')).toBe(false);
    expect(queue.hasPendingOrFailed()).toBe(true);

    firstWrite.resolve();
    await flushMicrotasks();

    expect(queue.getStatus('workspace:first.md')).toEqual({ status: 'clean' });
    expect(queue.hasPendingOrFailed()).toBe(false);
  });

  it('keeps failed status and emits an app error when the latest save fails', async () => {
    const failure = new Error('disk full');
    const writer = vi.fn(async () => {
      throw failure;
    });
    const emitAppError = vi.fn<(error: BaseError) => void>();
    const queue = new EditorSaveQueue(writer, emitAppError);

    queue.enqueue('workspace:note.md', 'content');
    await flushMicrotasks();

    const status = queue.getStatus('workspace:note.md');
    expect(status).toEqual({ error: failure, status: 'failed' });
    expect(emitAppError).toHaveBeenCalledTimes(1);

    const appError = getFirstEmittedAppError(emitAppError);
    expect(appError).toEqual({
      name: 'error::editor:save-failed',
      payload: {
        error: failure,
        wsPath: 'workspace:note.md',
      },
    });
  });

  it('does not emit a stale failure when a later queued doc succeeds', async () => {
    const firstWrite = createDeferred<void>();
    const writes: string[] = [];
    const writer = vi.fn((_: string, doc: string) => {
      writes.push(doc);
      return writes.length === 1 ? firstWrite.promise : Promise.resolve();
    });
    const emitAppError = vi.fn<(error: BaseError) => void>();
    const queue = new EditorSaveQueue(writer, emitAppError);

    queue.enqueue('workspace:note.md', 'first');
    queue.enqueue('workspace:note.md', 'second');
    firstWrite.reject(new Error('temporary failure'));
    await flushMicrotasks();

    expect(writes).toEqual(['first', 'second']);
    expect(queue.getStatus('workspace:note.md')).toEqual({ status: 'clean' });
    expect(emitAppError).not.toHaveBeenCalled();
  });

  it('keeps failed status when the latest queued doc fails', async () => {
    const firstWrite = createDeferred<void>();
    const latestFailure = new Error('latest failed');
    const writes: string[] = [];
    const writer = vi.fn((_: string, doc: string) => {
      writes.push(doc);
      return writes.length === 1
        ? firstWrite.promise
        : Promise.reject(latestFailure);
    });
    const emitAppError = vi.fn<(error: BaseError) => void>();
    const queue = new EditorSaveQueue(writer, emitAppError);

    queue.enqueue('workspace:note.md', 'first');
    queue.enqueue('workspace:note.md', 'latest');
    firstWrite.resolve();
    await flushMicrotasks();

    expect(writes).toEqual(['first', 'latest']);
    expect(queue.getStatus('workspace:note.md')).toEqual({
      error: latestFailure,
      status: 'failed',
    });
    expect(queue.hasPendingOrFailed('workspace:note.md')).toBe(true);
    expect(emitAppError).toHaveBeenCalledTimes(1);
  });

  it('retains the latest failed doc for retry', async () => {
    const failure = new Error('offline');
    const writes: string[] = [];
    const writer = vi.fn((_: string, doc: string) => {
      writes.push(doc);
      return writes.length === 1 ? Promise.reject(failure) : Promise.resolve();
    });
    const emitAppError = vi.fn<(error: BaseError) => void>();
    const queue = new EditorSaveQueue(writer, emitAppError);
    const saveStatusListener = vi.fn();
    queue.subscribe(saveStatusListener);

    queue.enqueue('workspace:note.md', 'unsaved latest body');
    await flushMicrotasks();

    expect(queue.getStatus('workspace:note.md')).toEqual({
      error: failure,
      status: 'failed',
    });
    expect(saveStatusListener).toHaveBeenCalledTimes(1);

    expect(queue.retryFailed('workspace:note.md')).toBe(true);
    expect(queue.getStatus('workspace:note.md')).toEqual({
      status: 'pending',
    });
    expect(saveStatusListener).toHaveBeenCalledTimes(1);
    await flushMicrotasks();

    expect(writes).toEqual(['unsaved latest body', 'unsaved latest body']);
    expect(queue.getStatus('workspace:note.md')).toEqual({ status: 'clean' });
    expect(saveStatusListener).toHaveBeenCalledTimes(2);
  });

  it('replaces a retained failed doc when a newer edit is queued', async () => {
    const failure = new Error('offline');
    const writes: string[] = [];
    const writer = vi.fn((_: string, doc: string) => {
      writes.push(doc);
      return writes.length === 1 ? Promise.reject(failure) : Promise.resolve();
    });
    const queue = new EditorSaveQueue(writer, vi.fn());

    queue.enqueue('workspace:note.md', 'failed body');
    await flushMicrotasks();

    queue.enqueue('workspace:note.md', 'replacement body');
    await flushMicrotasks();

    expect(writes).toEqual(['failed body', 'replacement body']);
    expect(queue.getStatus('workspace:note.md')).toEqual({ status: 'clean' });
    expect(queue.retryFailed('workspace:note.md')).toBe(false);
  });

  it('serializes writes from multiple producers for the same wsPath', async () => {
    const firstWrite = createDeferred<void>();
    const writes: string[] = [];
    const writer = vi.fn((_: string, doc: string) => {
      writes.push(doc);
      return writes.length === 1 ? firstWrite.promise : Promise.resolve();
    });
    const queue = new EditorSaveQueue(writer, vi.fn());

    queue.enqueue('workspace:note.md', 'first editor content');
    queue.enqueue('workspace:note.md', 'second editor content');

    expect(writes).toEqual(['first editor content']);

    firstWrite.resolve();
    await flushMicrotasks();

    expect(writes).toEqual(['first editor content', 'second editor content']);
    expect(queue.getStatus('workspace:note.md')).toEqual({ status: 'clean' });
  });

  it('serializes writes across queue instances that share a store', async () => {
    const firstWrite = createDeferred<void>();
    const store = createEditorSaveQueueStore();
    const writes: Array<{ doc: string; source: string }> = [];
    const firstQueue = new EditorSaveQueue(
      vi.fn((_: string, doc: string) => {
        writes.push({ doc, source: 'first' });
        return firstWrite.promise;
      }),
      vi.fn(),
      store,
    );
    const secondQueue = new EditorSaveQueue(
      vi.fn((_: string, doc: string) => {
        writes.push({ doc, source: 'second' });
        return Promise.resolve();
      }),
      vi.fn(),
      store,
    );

    firstQueue.enqueue('workspace:note.md', 'old service content');
    secondQueue.enqueue('workspace:note.md', 'new service content');

    expect(writes).toEqual([{ doc: 'old service content', source: 'first' }]);

    firstWrite.resolve();
    await flushMicrotasks();

    expect(writes).toEqual([
      { doc: 'old service content', source: 'first' },
      { doc: 'new service content', source: 'second' },
    ]);
    expect(secondQueue.getStatus('workspace:note.md')).toEqual({
      status: 'clean',
    });
  });

  it('notifies subscribers across queue instances that share a store', async () => {
    const firstWrite = createDeferred<void>();
    const store = createEditorSaveQueueStore();
    const firstQueue = new EditorSaveQueue(
      vi.fn(() => firstWrite.promise),
      vi.fn(),
      store,
    );
    const secondQueue = new EditorSaveQueue(vi.fn(), vi.fn(), store);
    const secondListener = vi.fn();

    firstQueue.enqueue('workspace:note.md', 'old service content');
    expect(secondQueue.hasPendingOrFailed()).toBe(true);

    const unsubscribe = secondQueue.subscribe(secondListener);
    firstWrite.resolve();

    await vi.waitFor(() => {
      expect(secondQueue.hasPendingOrFailed()).toBe(false);
    });
    expect(secondListener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('handles synchronously thrown writer errors', async () => {
    const failure = new Error('sync failure');
    const writer = vi.fn(() => {
      throw failure;
    });
    const emitAppError = vi.fn<(error: BaseError) => void>();
    const queue = new EditorSaveQueue(writer, emitAppError);

    queue.enqueue('workspace:note.md', 'content');
    await flushMicrotasks();

    expect(queue.getStatus('workspace:note.md')).toEqual({
      error: failure,
      status: 'failed',
    });
    expect(getFirstEmittedAppError(emitAppError)).toEqual({
      name: 'error::editor:save-failed',
      payload: {
        error: failure,
        wsPath: 'workspace:note.md',
      },
    });
  });

  it('wraps non-error writer failures before emitting app errors', async () => {
    const writer = vi.fn(async () => {
      throw 'sync unavailable';
    });
    const emitAppError = vi.fn<(error: BaseError) => void>();
    const queue = new EditorSaveQueue(writer, emitAppError);

    queue.enqueue('workspace:note.md', 'content');
    await flushMicrotasks();

    const status = queue.getStatus('workspace:note.md');
    expect(status.status).toBe('failed');
    if (status.status !== 'failed') {
      throw new Error('Expected failed save status');
    }
    expect(status.error).toBeInstanceOf(Error);
    expect(status.error.message).toBe('sync unavailable');
    expect(emitAppError).toHaveBeenCalledTimes(1);
  });
});
