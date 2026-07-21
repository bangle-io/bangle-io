import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { DATABASE_TABLE_NAME, SERVICE_NAME } from '@bangle.io/constants';
import { type InferType, T } from '@bangle.io/mini-js-utils';
import type { BaseDatabaseService } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';
import {
  computeSnapshotEvictions,
  NOTE_SNAPSHOT_MAX_PER_WORKSPACE,
  NOTE_SNAPSHOT_MIN_CAPTURE_INTERVAL_MS,
} from './note-snapshot-policy';

const NoteSnapshotValidator = T.Object({
  id: T.String,
  wsName: T.String,
  wsPath: T.String,
  content: T.String,
  wordCount: T.Number,
  createdAt: T.Number,
});

export type NoteSnapshotRecord = InferType<typeof NoteSnapshotValidator>;

/** A snapshot row without its content, for cheap listing in the UI. */
export type NoteSnapshotMetadata = Omit<NoteSnapshotRecord, 'content'>;

const TABLE = { tableName: DATABASE_TABLE_NAME.noteSnapshots } as const;

export function countWords(content: string): number {
  const words = content.match(/\S+/g);
  return words ? words.length : 0;
}

/**
 * Keeps point-in-time copies of note content in the app database so users can
 * recover overwritten or lost edits (for example when two tabs or two browsers
 * write to the same note). Snapshots are captured from the content a note had
 * on storage right before it gets overwritten, throttled per note, and thinned
 * with a recency-biased retention policy (see note-snapshot-policy.ts).
 *
 * Capture is best-effort by design: a snapshot failure must never block or
 * fail the actual save.
 */
export class NoteSnapshotService extends BaseService {
  static deps = ['database'] as const;

  private lastCaptureAt = new Map<string, number>();

  constructor(
    context: BaseServiceContext,
    private dependencies: { database: BaseDatabaseService },
    private config: {
      maxSnapshotsPerWorkspace?: number;
      minCaptureIntervalMs?: number;
    },
  ) {
    super(SERVICE_NAME.noteSnapshotService, context, dependencies);
  }

  private get maxSnapshotsPerWorkspace(): number {
    return (
      this.config.maxSnapshotsPerWorkspace ?? NOTE_SNAPSHOT_MAX_PER_WORKSPACE
    );
  }

  private get minCaptureIntervalMs(): number {
    return (
      this.config.minCaptureIntervalMs ?? NOTE_SNAPSHOT_MIN_CAPTURE_INTERVAL_MS
    );
  }

  async hookMount(): Promise<void> {}

  /**
   * Called by the file system right before an existing note is overwritten.
   * `readCurrent` reads the content still on storage (the about-to-be-replaced
   * version). Throttled per note so the common rapid-save path returns
   * synchronously without any storage read. Never throws.
   */
  async captureBeforeOverwrite(
    wsPath: string,
    readCurrent: () => Promise<File | undefined>,
  ): Promise<void> {
    try {
      await this.capture(wsPath, readCurrent);
    } catch (error) {
      this.logger.warn(
        `note snapshot capture failed for ${wsPath}; continuing without snapshot`,
        error,
      );
    }
  }

  private async capture(
    wsPath: string,
    readCurrent: () => Promise<File | undefined>,
  ): Promise<void> {
    const filePath = WsPath.fromString(wsPath).asFile();
    if (!filePath?.isMarkdown()) {
      return;
    }

    const now = Date.now();
    const lastCapture = this.lastCaptureAt.get(wsPath);
    if (
      lastCapture !== undefined &&
      now - lastCapture < this.minCaptureIntervalMs
    ) {
      return;
    }

    const file = await readCurrent();
    if (!file) {
      return;
    }
    const content = await file.text();
    // A note that was created but never given content has nothing worth
    // recovering; skip it instead of storing an empty snapshot.
    if (content.trim() === '') {
      return;
    }

    const wsName = filePath.wsName;
    const existing = await this.getWorkspaceRecords(wsName);
    const latestForNote = existing
      .filter((record) => record.wsPath === wsPath)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestForNote && latestForNote.content === content) {
      // Unchanged since the last snapshot; refresh the throttle so identical
      // content is not re-read on every save.
      this.lastCaptureAt.set(wsPath, now);
      return;
    }

    const record: NoteSnapshotRecord = {
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      wsName,
      wsPath,
      content,
      wordCount: countWords(content),
      createdAt: now,
    };

    // The snapshot write is awaited by the caller before the overwrite, so
    // the pre-overwrite content is durable before it disappears from storage.
    await this.dependencies.database.updateEntry(
      record.id,
      () => ({ value: record }),
      TABLE,
    );
    this.lastCaptureAt.set(wsPath, now);

    const evictIds = computeSnapshotEvictions([...existing, record], {
      now,
      maxPerWorkspace: this.maxSnapshotsPerWorkspace,
    });
    // Deleting an id another tab already removed is a no-op, so concurrent
    // eviction across tabs is safe.
    await Promise.all(
      evictIds.map((id) => this.dependencies.database.deleteEntry(id, TABLE)),
    );
  }

  /** Lists snapshots (without content), newest first. */
  async listSnapshots(options?: {
    wsName?: string;
  }): Promise<NoteSnapshotMetadata[]> {
    const records = await this.getAllRecords();
    return records
      .filter(
        (record) =>
          options?.wsName === undefined || record.wsName === options.wsName,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(({ content: _content, ...metadata }) => metadata);
  }

  /** Reads one full snapshot, including its content. */
  async getSnapshot(
    snapshotId: string,
  ): Promise<NoteSnapshotRecord | undefined> {
    const result = await this.dependencies.database.getEntry(snapshotId, TABLE);
    if (!result.found || !NoteSnapshotValidator.validate(result.value)) {
      return undefined;
    }
    return result.value;
  }

  private async getWorkspaceRecords(
    wsName: string,
  ): Promise<NoteSnapshotRecord[]> {
    const records = await this.getAllRecords();
    return records.filter((record) => record.wsName === wsName);
  }

  private async getAllRecords(): Promise<NoteSnapshotRecord[]> {
    const entries = await this.dependencies.database.getAllEntries(TABLE);
    const records: NoteSnapshotRecord[] = [];
    for (const value of entries) {
      if (NoteSnapshotValidator.validate(value)) {
        records.push(value);
      } else {
        this.logger.warn('Ignoring malformed note snapshot entry');
      }
    }
    return records;
  }
}
