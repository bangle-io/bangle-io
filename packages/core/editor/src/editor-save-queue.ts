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
};

type EditorSaveQueueStore = Map<string, SaveEntry>;
type SaveStatusListener = () => void;

export function createEditorSaveQueueStore(): EditorSaveQueueStore {
  return new Map();
}

export class EditorSaveQueue {
  private lastHasPendingOrFailed: boolean;
  private listeners = new Set<SaveStatusListener>();

  constructor(
    private writeDoc: SaveWriter,
    private emitAppError: ErrorHandler,
    private entries: EditorSaveQueueStore = createEditorSaveQueueStore(),
  ) {
    this.lastHasPendingOrFailed = this.hasPendingOrFailed();
  }

  enqueue(wsPath: string, doc: string): void {
    const entry = this.getEntry(wsPath);
    entry.failedTask = undefined;
    entry.pendingTask = {
      doc,
      emitAppError: this.emitAppError,
      writeDoc: this.writeDoc,
    };
    entry.status = { status: 'pending' };
    this.notifyListenersIfDirtyChanged();

    if (!entry.active) {
      entry.active = true;
      void this.flush(wsPath, entry);
    }
  }

  getStatus(wsPath: string): EditorSaveStatus {
    return this.entries.get(wsPath)?.status ?? { status: 'clean' };
  }

  hasPendingOrFailed(wsPath?: string): boolean {
    if (wsPath !== undefined) {
      return this.getStatus(wsPath).status !== 'clean';
    }

    for (const entry of this.entries.values()) {
      if (entry.status.status !== 'clean') {
        return true;
      }
    }

    return false;
  }

  subscribe(listener: SaveStatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  retryFailed(wsPath: string): boolean {
    const entry = this.entries.get(wsPath);
    if (!entry || entry.active || !entry.failedTask) {
      return false;
    }

    entry.pendingTask = entry.failedTask;
    entry.failedTask = undefined;
    entry.status = { status: 'pending' };
    this.notifyListenersIfDirtyChanged();
    entry.active = true;
    void this.flush(wsPath, entry);

    return true;
  }

  private getEntry(wsPath: string): SaveEntry {
    const existing = this.entries.get(wsPath);
    if (existing) {
      return existing;
    }

    const entry: SaveEntry = {
      active: false,
      status: { status: 'clean' },
    };
    this.entries.set(wsPath, entry);
    return entry;
  }

  private async flush(wsPath: string, entry: SaveEntry): Promise<void> {
    while (entry.pendingTask !== undefined) {
      const task = entry.pendingTask;
      entry.pendingTask = undefined;

      try {
        await task.writeDoc(wsPath, task.doc);
      } catch (cause) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        if (entry.pendingTask === undefined) {
          entry.failedTask = task;
          entry.status = { error, status: 'failed' };
          this.notifyListenersIfDirtyChanged();
          task.emitAppError(
            createAppError('error::editor:save-failed', 'Unable to save note', {
              error,
              wsPath,
            }),
          );
        } else {
          entry.failedTask = undefined;
          entry.status = { status: 'pending' };
          this.notifyListenersIfDirtyChanged();
        }
      }
    }

    entry.active = false;
    if (entry.status.status === 'pending') {
      entry.status = { status: 'clean' };
      this.notifyListenersIfDirtyChanged();
    }

    if (entry.pendingTask !== undefined) {
      entry.active = true;
      void this.flush(wsPath, entry);
      return;
    }

    if (entry.status.status === 'clean') {
      entry.failedTask = undefined;
      this.entries.delete(wsPath);
    }
  }

  private notifyListenersIfDirtyChanged(): void {
    const hasPendingOrFailed = this.hasPendingOrFailed();
    if (hasPendingOrFailed === this.lastHasPendingOrFailed) {
      return;
    }

    this.lastHasPendingOrFailed = hasPendingOrFailed;
    for (const listener of this.listeners) {
      listener();
    }
  }
}
