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
const NOTE_SNAPSHOT_MAX_CONTENT_BYTES = 4 * 1024 * 1024;

/**
 * How many notes' outgoing content one tab keeps in memory to protect the
 * "losing writer" in a cross-tab overwrite race (see recordOutgoingWrite).
 */
const OUTGOING_WRITE_CACHE_SIZE = 32;
const SNAPSHOT_LOCK_PREFIX = 'bangle:note-snapshots:';

export function countWords(content: string): number {
  const words = content.match(/\S+/g);
  return words ? words.length : 0;
}

/**
 * Cheap content fingerprint (djb2 + length). Collisions are possible, so a
 * matching hash is only a hint — equality must be confirmed against the
 * actual stored body before skipping a snapshot.
 */
function hashContent(content: string): string {
  let hash = 5381;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) + hash + content.charCodeAt(i)) | 0;
  }
  return `${content.length}:${hash}`;
}

function byNewestMetaFirst(
  a: NoteSnapshotMetadata,
  b: NoteSnapshotMetadata,
): number {
  return b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

/**
 * Keeps point-in-time copies of note content in the app database so users can
 * recover overwritten or lost edits (for example when two tabs write to the
 * same note). Snapshots are captured from the content a note had on storage
 * right before it gets overwritten, throttled per note, and thinned with a
 * recency-biased retention policy (see note-snapshot-policy.ts).
 *
 * Two cross-tab protections close the concurrent-writer races:
 * - a content update from another tab clears the local capture throttle, so
 *   the next local save re-captures the foreign content it overwrites;
 * - every save's outgoing content is remembered in memory, and when a
 *   foreign update arrives it is snapshotted directly, so a "losing writer"
 *   preserves its own version without any storage read or lock.
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
  private lastWrittenContent = new Map<
    string,
    { content: string; preserved: boolean }
  >();
  private lastIssuedCreatedAt = 0;
  private localSnapshotLockTails = new Map<string, Promise<void>>();

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

  /**
   * Snapshot timestamps are strictly monotonic within a tab, so two captures
   * in the same millisecond (e.g. a save racing an outgoing-write
   * preservation) still have a deterministic order everywhere they are
   * sorted or thinned.
   */
  private nextCreatedAt(): number {
    const createdAt = Math.max(Date.now(), this.lastIssuedCreatedAt + 1);
    this.lastIssuedCreatedAt = createdAt;
    return createdAt;
  }

  async hookMount(): Promise<void> {
    this.config.emitter.on(
      'event::file:update',
      (event) => {
        if (event.type === 'file-create' || event.type === 'file-delete') {
          this.clearPathState(event.wsPath);
        } else if (event.type === 'file-rename') {
          this.relocatePathState(event.oldWsPath, event.wsPath);
        } else if (event.sender.id !== this.config.selfSenderId) {
          // Another tab changed this note. Drop the local throttle so this
          // tab's next save re-captures the content it is about to overwrite.
          this.lastCaptureAt.delete(event.wsPath);
          // And preserve what this tab last wrote: if that write just lost the
          // race, its content only exists in this map now.
          const outgoing = this.lastWrittenContent.get(event.wsPath);
          if (outgoing && !outgoing.preserved) {
            outgoing.preserved = true;
            void this.preserveContent(event.wsPath, outgoing.content);
          }
        }
      },
      this.abortSignal,
    );
  }

  private clearPathState(wsPath: string): void {
    this.lastCaptureAt.delete(wsPath);
    this.lastWrittenContent.delete(wsPath);
  }

  private relocatePathState(oldWsPath: string | undefined, wsPath: string) {
    this.clearPathState(wsPath);
    if (!oldWsPath) {
      return;
    }

    const lastCaptureAt = this.lastCaptureAt.get(oldWsPath);
    const lastWrittenContent = this.lastWrittenContent.get(oldWsPath);
    this.clearPathState(oldWsPath);
    if (lastCaptureAt !== undefined) {
      this.lastCaptureAt.set(wsPath, lastCaptureAt);
    }
    if (lastWrittenContent !== undefined) {
      this.lastWrittenContent.set(wsPath, lastWrittenContent);
    }
  }

  private async withWorkspaceSnapshotLock<T>(
    wsName: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    const locks = (globalThis as { navigator?: { locks?: LockManager } })
      .navigator?.locks;
    if (locks) {
      return (await locks.request(
        `${SNAPSHOT_LOCK_PREFIX}${wsName}`,
        { mode: 'exclusive' },
        callback,
      )) as T;
    }

    const previous =
      this.localSnapshotLockTails.get(wsName) ?? Promise.resolve();
    let releaseLocalLock: (() => void) | undefined;
    const localLock = new Promise<void>((resolve) => {
      releaseLocalLock = resolve;
    });
    this.localSnapshotLockTails.set(wsName, localLock);
    await previous;

    try {
      return await callback();
    } finally {
      releaseLocalLock?.();
      if (this.localSnapshotLockTails.get(wsName) === localLock) {
        this.localSnapshotLockTails.delete(wsName);
      }
    }
  }

  /**
   * Reads an eligible outgoing note before its write starts. The caller keeps
   * this text until the durable write succeeds, then records it synchronously
   * before publishing the file-update event.
   */
  async prepareOutgoingWrite(
    wsPath: string,
    file: File,
  ): Promise<string | undefined> {
    const filePath = WsPath.fromString(wsPath).asFile();
    if (
      !filePath?.isMarkdown() ||
      file.size > NOTE_SNAPSHOT_MAX_CONTENT_BYTES
    ) {
      return undefined;
    }
    try {
      return await file.text();
    } catch (error) {
      this.logger.warn(`could not read outgoing write for ${wsPath}`, error);
      return undefined;
    }
  }

  /** Records a successful write before its update event can be observed. */
  recordOutgoingWrite(wsPath: string, content: string | undefined): void {
    if (content === undefined) {
      return;
    }
    // Re-insert to refresh LRU order, then trim the oldest entry.
    this.lastWrittenContent.delete(wsPath);
    this.lastWrittenContent.set(wsPath, { content, preserved: false });
    if (this.lastWrittenContent.size > OUTGOING_WRITE_CACHE_SIZE) {
      const oldest = this.lastWrittenContent.keys().next().value;
      if (oldest !== undefined) {
        this.lastWrittenContent.delete(oldest);
      }
    }
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

    const stored = await this.storeSnapshot(wsPath, content);
    if (stored !== 'failed') {
      this.lastCaptureAt.set(wsPath, now);
    }
  }

  /** Best-effort preservation of this tab's outgoing content. Never throws. */
  private async preserveContent(
    wsPath: string,
    content: string,
  ): Promise<void> {
    try {
      if (content.trim() === '') {
        return;
      }
      await this.storeSnapshot(wsPath, content);
    } catch (error) {
      this.logger.warn(
        `could not preserve outgoing content for ${wsPath}`,
        error,
      );
    }
  }

  /**
   * Stores one snapshot (deduped against the newest stored snapshot of the
   * note) and runs eviction. Returns 'failed' for an invalid path; storage
   * errors throw.
   */
  private async storeSnapshot(
    wsPath: string,
    content: string,
  ): Promise<'stored' | 'duplicate' | 'failed'> {
    const filePath = WsPath.fromString(wsPath).asFile();
    if (!filePath) {
      return 'failed';
    }
    const wsName = filePath.wsName;
    return this.withWorkspaceSnapshotLock(wsName, async () => {
      const contentHash = hashContent(content);
      const existing = await this.getWorkspaceMetas(wsName);
      const latestForNote = existing
        .filter((meta) => meta.wsPath === wsPath)
        .sort(byNewestMetaFirst)[0];

      // The hash is only a fast negative check; on a match, confirm against
      // the stored body so a hash collision can never silently drop a
      // distinct version.
      if (latestForNote && latestForNote.contentHash === contentHash) {
        const latestBody = await this.getSnapshotContent(latestForNote.id);
        if (latestBody === content) {
          return 'duplicate';
        }
      }

      const createdAt = this.nextCreatedAt();
      const meta: NoteSnapshotMetadata = {
        id: `${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        wsName,
        wsPath,
        wordCount: countWords(content),
        createdAt,
        contentHash,
      };

      // Content first, then metadata, with a compensating delete: a snapshot
      // is either fully present or invisible. Both writes are awaited by the
      // caller before the overwrite proceeds.
      await this.dependencies.database.updateEntry(
        meta.id,
        () => ({ value: { id: meta.id, content } }),
        CONTENT_TABLE,
      );
      try {
        await this.dependencies.database.updateEntry(
          meta.id,
          () => ({ value: meta }),
          META_TABLE,
        );
      } catch (error) {
        try {
          await this.dependencies.database.deleteEntry(meta.id, CONTENT_TABLE);
        } catch {
          // The orphaned body is invisible (no metadata row) and bounded by
          // how often metadata writes fail; nothing further to do here.
        }
        throw error;
      }

      const evictIds = computeSnapshotEvictions([...existing, meta], {
        now: createdAt,
        maxPerWorkspace: this.maxSnapshotsPerWorkspace,
      });
      // Per id: body first, then metadata. If either delete fails the
      // metadata row survives, so the next eviction round retries the pair;
      // deleting an id another tab already removed is a no-op.
      await Promise.all(
        evictIds.map(async (id) => {
          await this.dependencies.database.deleteEntry(id, CONTENT_TABLE);
          await this.dependencies.database.deleteEntry(id, META_TABLE);
        }),
      );
      return 'stored';
    });
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
      .sort(byNewestMetaFirst);
  }

  /** Reads one full snapshot, including its content. */
  async getSnapshot(
    snapshotId: string,
  ): Promise<NoteSnapshotRecord | undefined> {
    const metaResult = await this.dependencies.database.getEntry(
      snapshotId,
      META_TABLE,
    );
    if (
      !metaResult.found ||
      !NoteSnapshotMetaValidator.validate(metaResult.value)
    ) {
      return undefined;
    }
    const content = await this.getSnapshotContent(snapshotId);
    if (content === undefined) {
      return undefined;
    }
    return { ...metaResult.value, content };
  }

  private async getSnapshotContent(
    snapshotId: string,
  ): Promise<string | undefined> {
    const result = await this.dependencies.database.getEntry(
      snapshotId,
      CONTENT_TABLE,
    );
    if (!result.found || !NoteSnapshotContentValidator.validate(result.value)) {
      return undefined;
    }
    return result.value.content;
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
