import type { CollabStateInfo } from './common';

// A helper class to manage the writing of a document to disk.
// It focuses on the queue and making sure that any item in the queue
// is updated with the latest state of the document.
export class WriteQueue {
  private _pendingWrites = new Set<string>();
  private _running = false;
  private _writeQueue: CollabStateInfo[] = [];

  constructor(
    private _abortSignal: AbortSignal,
    private _write: (collabStateInfo: CollabStateInfo) => Promise<void>,
    private _onPendingChange: (
      type: 'ADD' | 'REMOVE',
      wsPath: string,
      pendingWrites: string[],
    ) => void,
  ) {}

  get isRunning() {
    return this._running;
  }

  get queue() {
    return [...this._writeQueue];
  }

  add(item: CollabStateInfo) {
    if (this._abortSignal.aborted) {
      console.warn('WriteQueue: aborted cannot write', item.wsPath);

      return;
    }

    const existing = this._writeQueue.find((q) => q.wsPath === item.wsPath);

    if (existing) {
      // Modifying in place with latest information, if the item exists in the queue
      existing.collabState = item.collabState;
    } else {
      // Otherwise, we add it to the queue
      this._writeQueue.push({ ...item });
    }

    // if it is already running, the item will be processed, since we added it
    // to the queue above.
    if (this._running) {
      return;
    }

    // else trigger the queue to run
    this._running = true;
    this.run().finally(() => {
      this._running = false;
    });
  }

  async run() {
    if (this._writeQueue.length === 0) {
      return;
    }

    while (this._writeQueue.length > 0) {
      const item = this._writeQueue.shift();

      if (!item) {
        return;
      }

      if (this._abortSignal.aborted) {
        console.warn('WriteQueue: aborted cannot write', item.wsPath);

        return;
      }

      const { wsPath } = item;
      this.updateWriteStatus(wsPath, true);

      try {
        await this._write(item);
      } catch {
        // ignore all errors as it is the callers responsibility to handle them
      } finally {
        this.updateWriteStatus(wsPath, false);
      }
    }
  }

  updateWriteStatus(wsPath: string, pendingWrite: boolean) {
    if (pendingWrite) {
      this._pendingWrites.add(wsPath);
    } else {
      this._pendingWrites.delete(wsPath);
    }

    this._onPendingChange(pendingWrite ? 'ADD' : 'REMOVE', wsPath, [
      ...this._pendingWrites,
    ]);
  }
}
