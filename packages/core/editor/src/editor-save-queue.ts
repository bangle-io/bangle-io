import { type BaseError, createAppError } from '@bangle.io/base-utils';

export type EditorSaveStatus =
  | { status: 'clean' }
  | { status: 'pending' }
  | { error: Error; status: 'failed' };

type SaveWriter = (wsPath: string, doc: string) => Promise<void>;
type ErrorHandler = (error: BaseError) => void;

type SaveTask = {
  doc: string;
};

type EditorSaveSession = {
  emitAppError: ErrorHandler;
  writeDoc: SaveWriter;
};

type SaveEntry = {
  active: boolean;
  activeTask?: SaveTask;
  blockingFlush?: Promise<void>;
  failedTask?: SaveTask;
  flushPromise?: Promise<void>;
  pendingTask?: SaveTask;
  retired: boolean;
  status: EditorSaveStatus;
  wsPath: string;
};

type SaveStatusListener = () => void;
type SaveStatusSubscription = {
  listener: SaveStatusListener;
  wsPath?: string;
};

/**
 * Browser-root state shared by each editor service graph created in this tab.
 * Queued documents can outlive a UI reload, while the current session always
 * points at the newest graph's writer and error boundary.
 */
export type EditorSaveCoordinator = {
  currentSession?: EditorSaveSession;
  entries: Map<string, SaveEntry>;
  lastHasPendingOrFailed: boolean;
  subscriptions: Set<SaveStatusSubscription>;
};

export function createEditorSaveCoordinator(): EditorSaveCoordinator {
  return {
    entries: new Map(),
    lastHasPendingOrFailed: false,
    subscriptions: new Set(),
  };
}

export class EditorSaveQueue {
  constructor(
    writeDoc: SaveWriter,
    emitAppError: ErrorHandler,
    private coordinator: EditorSaveCoordinator = createEditorSaveCoordinator(),
  ) {
    this.coordinator.currentSession = { writeDoc, emitAppError };
  }

  enqueue(wsPath: string, doc: string): void {
    const entry = this.getEntry(wsPath);
    entry.failedTask = undefined;
    entry.pendingTask = { doc };
    entry.status = { status: 'pending' };
    this.notifySaveStatusChanged(wsPath);

    if (!entry.active) {
      this.startFlush(entry);
    }
  }

  getStatus(wsPath: string): EditorSaveStatus {
    return this.coordinator.entries.get(wsPath)?.status ?? { status: 'clean' };
  }

  hasPendingOrFailed(wsPath?: string): boolean {
    if (wsPath !== undefined) {
      return this.getStatus(wsPath).status !== 'clean';
    }

    for (const entry of this.coordinator.entries.values()) {
      if (entry.status.status !== 'clean') {
        return true;
      }
    }

    return false;
  }

  subscribe(listener: SaveStatusListener, wsPath?: string): () => void {
    const subscription = { listener, wsPath };
    this.coordinator.subscriptions.add(subscription);
    return () => {
      this.coordinator.subscriptions.delete(subscription);
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

    const entry = this.coordinator.entries.get(oldWsPath);
    if (!entry) {
      return;
    }
    const destinationEntry = this.coordinator.entries.get(newWsPath);
    if (destinationEntry && destinationEntry !== entry) {
      // The durable rename makes the source entry authoritative. Retire any
      // stale destination producer, then replay the latest source task after
      // its in-flight write settles so that it cannot overwrite the rename.
      destinationEntry.retired = true;
      destinationEntry.pendingTask = undefined;
      destinationEntry.failedTask = undefined;
      destinationEntry.status = { status: 'clean' };
      if (destinationEntry.flushPromise) {
        const destinationFlush = destinationEntry.flushPromise.catch(() => {});
        entry.blockingFlush = entry.blockingFlush
          ? Promise.allSettled([entry.blockingFlush, destinationFlush]).then(
              () => {},
            )
          : destinationFlush;
      }
      if (entry.activeTask) {
        entry.pendingTask ??= entry.activeTask;
      }
      if (this.coordinator.entries.get(newWsPath) === destinationEntry) {
        this.coordinator.entries.delete(newWsPath);
      }
    }

    this.coordinator.entries.delete(oldWsPath);
    entry.wsPath = newWsPath;
    this.coordinator.entries.set(newWsPath, entry);

    if (!entry.active && entry.failedTask) {
      entry.pendingTask = entry.failedTask;
      entry.failedTask = undefined;
      entry.status = { status: 'pending' };
    }
    if (!entry.active && entry.pendingTask) {
      this.startFlush(entry);
    }

    this.notifySaveStatusChanged(oldWsPath);
    this.notifySaveStatusChanged(newWsPath);
  }

  retryFailed(wsPath: string): boolean {
    const entry = this.coordinator.entries.get(wsPath);
    if (!entry || entry.active || !entry.failedTask) {
      return false;
    }

    entry.pendingTask = entry.failedTask;
    entry.failedTask = undefined;
    entry.status = { status: 'pending' };
    this.notifySaveStatusChanged(wsPath);
    this.startFlush(entry);

    return true;
  }

  private getEntry(wsPath: string): SaveEntry {
    const existing = this.coordinator.entries.get(wsPath);
    if (existing) {
      return existing;
    }

    const entry: SaveEntry = {
      active: false,
      retired: false,
      status: { status: 'clean' },
      wsPath,
    };
    this.coordinator.entries.set(wsPath, entry);
    return entry;
  }

  private async flush(entry: SaveEntry): Promise<void> {
    while (entry.pendingTask !== undefined) {
      const task = entry.pendingTask;
      entry.pendingTask = undefined;
      const blockingFlush = entry.blockingFlush;
      entry.blockingFlush = undefined;
      if (blockingFlush) {
        await blockingFlush;
      }
      if (entry.retired) {
        break;
      }

      const writeWsPath = entry.wsPath;
      entry.activeTask = task;

      try {
        const session = this.coordinator.currentSession;
        if (!session) {
          throw new Error('Editor save coordinator has no active session');
        }
        await session.writeDoc(writeWsPath, task.doc);
      } catch (cause) {
        if (entry.retired) {
          continue;
        }
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
          this.coordinator.currentSession?.emitAppError(
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
      } finally {
        entry.activeTask = undefined;
      }
    }

    entry.active = false;
    if (entry.retired) {
      entry.failedTask = undefined;
      entry.pendingTask = undefined;
      entry.status = { status: 'clean' };
      return;
    }

    if (entry.status.status === 'pending') {
      entry.status = { status: 'clean' };
      this.notifySaveStatusChanged(entry.wsPath);
    }

    if (entry.pendingTask !== undefined) {
      this.startFlush(entry);
      return;
    }

    if (entry.status.status === 'clean') {
      entry.failedTask = undefined;
      if (this.coordinator.entries.get(entry.wsPath) === entry) {
        this.coordinator.entries.delete(entry.wsPath);
      }
    }
  }

  private startFlush(entry: SaveEntry): void {
    entry.active = true;
    const flushPromise = this.flush(entry);
    entry.flushPromise = flushPromise;
    void flushPromise.then(
      () => {
        if (entry.flushPromise === flushPromise) {
          entry.flushPromise = undefined;
        }
      },
      () => {
        if (entry.flushPromise === flushPromise) {
          entry.flushPromise = undefined;
        }
      },
    );
  }

  private notifySaveStatusChanged(changedWsPath: string): void {
    const hasPendingOrFailed = this.hasPendingOrFailed();
    const globalStatusChanged =
      hasPendingOrFailed !== this.coordinator.lastHasPendingOrFailed;
    this.coordinator.lastHasPendingOrFailed = hasPendingOrFailed;

    for (const subscription of this.coordinator.subscriptions) {
      if (
        subscription.wsPath === changedWsPath ||
        (subscription.wsPath === undefined && globalStatusChanged)
      ) {
        subscription.listener();
      }
    }
  }
}
