import { type BaseError, createAppError } from '@bangle.io/base-utils';

export type EditorSaveStatus =
  | { status: 'clean' }
  | { status: 'pending' }
  | { error: Error; status: 'failed' };

type SaveWriter = (wsPath: string, doc: string) => Promise<void>;
type ErrorHandler = (error: BaseError) => void;

type SaveTask = {
  doc: string;
  emitAppError: ErrorHandler;
  writeDoc: SaveWriter;
};

type SaveEntry = {
  active: boolean;
  failedTask?: SaveTask;
  pendingTask?: SaveTask;
  status: EditorSaveStatus;
  wsPath: string;
};

type SaveStatusListener = () => void;
type SaveStatusSubscription = {
  listener: SaveStatusListener;
  wsPath?: string;
};

type EditorSaveQueueStore = {
  entries: Map<string, SaveEntry>;
  lastHasPendingOrFailed: boolean;
  subscriptions: Set<SaveStatusSubscription>;
};

export function createEditorSaveQueueStore(): EditorSaveQueueStore {
  return {
    entries: new Map(),
    lastHasPendingOrFailed: false,
    subscriptions: new Set(),
  };
}

export class EditorSaveQueue {
  constructor(
    private writeDoc: SaveWriter,
    private emitAppError: ErrorHandler,
    private store: EditorSaveQueueStore = createEditorSaveQueueStore(),
  ) {}

  enqueue(wsPath: string, doc: string): void {
    const entry = this.getEntry(wsPath);
    entry.failedTask = undefined;
    entry.pendingTask = {
      doc,
      emitAppError: this.emitAppError,
      writeDoc: this.writeDoc,
    };
    entry.status = { status: 'pending' };
    this.notifySaveStatusChanged(wsPath);

    if (!entry.active) {
      entry.active = true;
      void this.flush(entry);
    }
  }

  getStatus(wsPath: string): EditorSaveStatus {
    return this.store.entries.get(wsPath)?.status ?? { status: 'clean' };
  }

  hasPendingOrFailed(wsPath?: string): boolean {
    if (wsPath !== undefined) {
      return this.getStatus(wsPath).status !== 'clean';
    }

    for (const entry of this.store.entries.values()) {
      if (entry.status.status !== 'clean') {
        return true;
      }
    }

    return false;
  }

  subscribe(listener: SaveStatusListener, wsPath?: string): () => void {
    const subscription = { listener, wsPath };
    this.store.subscriptions.add(subscription);
    return () => {
      this.store.subscriptions.delete(subscription);
    };
  }

  /**
   * Retargets queued work after a durable file rename. An in-flight write that
   * loses the race with the rename is retried at the destination, while a
   * newer pending edit continues to win through the queue's normal coalescing.
   */
  relocate(oldWsPath: string, newWsPath: string): void {
    if (oldWsPath === newWsPath) {
      return;
    }

    const entry = this.store.entries.get(oldWsPath);
    if (!entry) {
      return;
    }
    if (this.store.entries.has(newWsPath)) {
      throw new Error(
        `Cannot relocate save queue to occupied path: ${newWsPath}`,
      );
    }

    this.store.entries.delete(oldWsPath);
    entry.wsPath = newWsPath;
    this.store.entries.set(newWsPath, entry);

    if (!entry.active && entry.failedTask) {
      entry.pendingTask = entry.failedTask;
      entry.failedTask = undefined;
      entry.status = { status: 'pending' };
    }
    if (!entry.active && entry.pendingTask) {
      entry.active = true;
      void this.flush(entry);
    }

    this.notifySaveStatusChanged(oldWsPath);
    this.notifySaveStatusChanged(newWsPath);
  }

  retryFailed(wsPath: string): boolean {
    const entry = this.store.entries.get(wsPath);
    if (!entry || entry.active || !entry.failedTask) {
      return false;
    }

    entry.pendingTask = entry.failedTask;
    entry.failedTask = undefined;
    entry.status = { status: 'pending' };
    this.notifySaveStatusChanged(wsPath);
    entry.active = true;
    void this.flush(entry);

    return true;
  }

  private getEntry(wsPath: string): SaveEntry {
    const existing = this.store.entries.get(wsPath);
    if (existing) {
      return existing;
    }

    const entry: SaveEntry = {
      active: false,
      status: { status: 'clean' },
      wsPath,
    };
    this.store.entries.set(wsPath, entry);
    return entry;
  }

  private async flush(entry: SaveEntry): Promise<void> {
    while (entry.pendingTask !== undefined) {
      const task = entry.pendingTask;
      entry.pendingTask = undefined;
      const writeWsPath = entry.wsPath;

      try {
        await task.writeDoc(writeWsPath, task.doc);
      } catch (cause) {
        if (writeWsPath !== entry.wsPath) {
          // A durable rename overtook this write. Retry it at the destination
          // unless a newer edit is already pending there.
          entry.pendingTask ??= task;
          entry.failedTask = undefined;
          entry.status = { status: 'pending' };
          this.notifySaveStatusChanged(entry.wsPath);
          continue;
        }

        const error = cause instanceof Error ? cause : new Error(String(cause));
        if (entry.pendingTask === undefined) {
          entry.failedTask = task;
          entry.status = { error, status: 'failed' };
          this.notifySaveStatusChanged(entry.wsPath);
          task.emitAppError(
            createAppError('error::editor:save-failed', 'Unable to save note', {
              error,
              wsPath: entry.wsPath,
            }),
          );
        } else {
          entry.failedTask = undefined;
          entry.status = { status: 'pending' };
          this.notifySaveStatusChanged(entry.wsPath);
        }
      }
    }

    entry.active = false;
    if (entry.status.status === 'pending') {
      entry.status = { status: 'clean' };
      this.notifySaveStatusChanged(entry.wsPath);
    }

    if (entry.pendingTask !== undefined) {
      entry.active = true;
      void this.flush(entry);
      return;
    }

    if (entry.status.status === 'clean') {
      entry.failedTask = undefined;
      this.store.entries.delete(entry.wsPath);
    }
  }

  private notifySaveStatusChanged(changedWsPath: string): void {
    const hasPendingOrFailed = this.hasPendingOrFailed();
    const globalStatusChanged =
      hasPendingOrFailed !== this.store.lastHasPendingOrFailed;
    this.store.lastHasPendingOrFailed = hasPendingOrFailed;

    for (const subscription of this.store.subscriptions) {
      if (
        subscription.wsPath === changedWsPath ||
        (subscription.wsPath === undefined && globalStatusChanged)
      ) {
        subscription.listener();
      }
    }
  }
}
