import { BaseService, type BaseServiceContext } from '@bangle.io/base-utils';
import { DATABASE_TABLE_NAME, SERVICE_NAME } from '@bangle.io/constants';
import { type InferType, T } from '@bangle.io/mini-js-utils';
import type { BaseDatabaseService, ScopedEmitter } from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';
import {
  computeSnapshotEvictions,
  NOTE_SNAPSHOT_MAX_PER_WORKSPACE,
  NOTE_SNAPSHOT_MIN_CAPTURE_INTERVAL_MS,
} from './note-snapshot-policy';

const NoteSnapshotMetaValidator = T.Object({
  id: T.String,
  wsName: T.String,
  wsPath: T.String,
  wordCount: T.Number,
  createdAt: T.Number,
  contentHash: T.String,
});

const NoteSnapshotContentValidator = T.Object({
  id: T.String,
  content: T.String,
});

/** A snapshot row without its content, for cheap listing in the UI. */
export type NoteSnapshotMetadata = InferType<typeof NoteSnapshotMetaValidator>;

export type NoteSnapshotRecord = NoteSnapshotMetadata & { content: string };

const META_TABLE = { tableName: DATABASE_TABLE_NAME.noteSnapshots } as const;
const CONTENT_TABLE = {
  tableName: DATABASE_TABLE_NAME.noteSnapshotsContent,
} as const;

/**
 * Notes larger than this are not snapshotted: the recovery value of a huge
 * generated/imported file is low compared to the storage and read cost.
 */
export const NOTE_SNAPSHOT_MAX_CONTENT_BYTES = 4 * 1024 * 1024;

export function countWords(content: string): number {
  const words = content.match(/\S+/g);
  return words ? words.length : 0;
}

/** Cheap content fingerprint (djb2 + length) used to skip duplicate snapshots. */
function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
  }
  return `${content.length}:${hash}`;
}

/**
 * Keeps point-in-time copies of note content in the app database so users can
 * recover overwritten or lost edits (for example when two tabs write to the
 * same note). Snapshots are captured from the content a note had on storage
 * right before it gets overwritten, throttled per note, and thinned with a
 * recency-biased retention policy (see note-snapshot-policy.ts).
 *
 * Metadata and content bodies live in separate tables so listing and eviction
 * never load snapshot bodies.
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
      emitter: ScopedEmitter<'event::file:update'>;
      /** This browsing context's event-sender id (BROWSING_CONTEXT_ID). */
      selfSenderId: string;
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

  async hookMount(): Promise<void> {
    this.config.emitter.on(
      'event::file:update',
      (event) => {
        // Another tab changed this note. Drop the local throttle so this
        // tab's next save re-captures the content it is about to overwrite —
        // otherwise the other tab's version could be lost inside the
        // throttle window.
        if (
          event.type === 'file-content-update' &&
          event.sender.id !== this.config.selfSenderId
        ) {
          this.lastCaptureAt.delete(event.wsPath);
        }
      },
      this.abortSignal,
    );
  }

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
    if (file.size > NOTE_SNAPSHOT_MAX_CONTENT_BYTES) {
      this.logger.warn(
        `skipping snapshot of ${wsPath}: ${file.size} bytes exceeds the snapshot size limit`,
      );
      this.lastCaptureAt.set(wsPath, now);
      return;
    }
    const content = await file.text();
    // A note that was created but never given content has nothing worth
    // recovering; skip it instead of storing an empty snapshot.
    if (content.trim() === '') {
      return;
    }

    const wsName = filePath.wsName;
    const contentHash = hashContent(content);
    const existing = await this.getWorkspaceMetas(wsName);
    const latestForNote = existing
      .filter((meta) => meta.wsPath === wsPath)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestForNote && latestForNote.contentHash === contentHash) {
      // Unchanged since the last snapshot; refresh the throttle so identical
      // content is not re-read on every save.
      this.lastCaptureAt.set(wsPath, now);
      return;
    }

    const meta: NoteSnapshotMetadata = {
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      wsName,
      wsPath,
      wordCount: countWords(content),
      createdAt: now,
      contentHash,
    };

    // Content first, then metadata: a failure in between leaves an invisible
    // orphaned body (rare, bounded) instead of a listed snapshot whose
    // content is missing. Both writes are awaited by the caller before the
    // overwrite, so the pre-overwrite content is durable before it
    // disappears from storage.
    await this.dependencies.database.updateEntry(
      meta.id,
      () => ({ value: { id: meta.id, content } }),
      CONTENT_TABLE,
    );
    await this.dependencies.database.updateEntry(
      meta.id,
      () => ({ value: meta }),
      META_TABLE,
    );
    this.lastCaptureAt.set(wsPath, now);

    const evictIds = computeSnapshotEvictions([...existing, meta], {
      now,
      maxPerWorkspace: this.maxSnapshotsPerWorkspace,
    });
    // Deleting an id another tab already removed is a no-op, so concurrent
    // eviction across tabs is safe.
    await Promise.all(
      evictIds.flatMap((id) => [
        this.dependencies.database.deleteEntry(id, META_TABLE),
        this.dependencies.database.deleteEntry(id, CONTENT_TABLE),
      ]),
    );
  }

  /** Lists snapshots (without content), newest first. */
  async listSnapshots(options?: {
    wsName?: string;
  }): Promise<NoteSnapshotMetadata[]> {
    const metas = await this.getAllMetas();
    return metas
      .filter(
        (meta) =>
          options?.wsName === undefined || meta.wsName === options.wsName,
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Reads one full snapshot, including its content. */
  async getSnapshot(
    snapshotId: string,
  ): Promise<NoteSnapshotRecord | undefined> {
    const [metaResult, contentResult] = await Promise.all([
      this.dependencies.database.getEntry(snapshotId, META_TABLE),
      this.dependencies.database.getEntry(snapshotId, CONTENT_TABLE),
    ]);
    if (
      !metaResult.found ||
      !NoteSnapshotMetaValidator.validate(metaResult.value) ||
      !contentResult.found ||
      !NoteSnapshotContentValidator.validate(contentResult.value)
    ) {
      return undefined;
    }
    return { ...metaResult.value, content: contentResult.value.content };
  }

  private async getWorkspaceMetas(
    wsName: string,
  ): Promise<NoteSnapshotMetadata[]> {
    const metas = await this.getAllMetas();
    return metas.filter((meta) => meta.wsName === wsName);
  }

  private async getAllMetas(): Promise<NoteSnapshotMetadata[]> {
    const entries = await this.dependencies.database.getAllEntries(META_TABLE);
    const metas: NoteSnapshotMetadata[] = [];
    for (const value of entries) {
      if (NoteSnapshotMetaValidator.validate(value)) {
        metas.push(value);
      } else {
        this.logger.warn('Ignoring malformed note snapshot entry');
      }
    }
    return metas;
  }
}
