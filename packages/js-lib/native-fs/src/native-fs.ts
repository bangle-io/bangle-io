import {
  guardNativeFsOp,
  isNativeFsError,
  NATIVE_FS_ERROR_CODE,
  NativeFsError,
  toNativeFsError,
} from './errors';
import { joinPath, splitFilePath, splitPath } from './path';
import { ensurePermission } from './permissions';
import type {
  CreateWritableOpts,
  FileSystemChangeRecordLike,
  FileSystemChangeType,
  FileSystemObserverConstructor,
  MovableFileHandle,
} from './types';

export interface NativeFsOpts {
  rootHandle: FileSystemDirectoryHandle;
  /**
   * Namespace for the cross-tab write locks taken around mutations. Defaults
   * to the root handle's name; pass something more unique (e.g. a workspace
   * id) when two different roots can share a basename.
   */
  lockScope?: string;
}

export interface ListFilesOpts {
  /** Root-relative directory to list from. Defaults to the root itself. */
  dirPath?: string;
  signal?: AbortSignal;
  /** Return false to skip a directory (and its whole subtree). */
  includeDirectory?: (name: string) => boolean;
  /** Return false to omit a file from the results. */
  includeFile?: (name: string) => boolean;
}

export interface NativeFsStat {
  mtimeMs: number;
  sizeBytes: number;
}

export interface NativeFsWatchHandle {
  /** False when `FileSystemObserver` is unavailable or the signal aborted. */
  armed: boolean;
  /** Disconnects this observer. Idempotent, and implied by the signal. */
  stop: () => void;
}

export interface NativeFsChange {
  type: FileSystemChangeType;
  /** Root-relative path of the changed entry; `''` is the root itself. */
  path: string;
  /** For `moved` records, the root-relative path the entry moved from. */
  movedFromPath?: string;
  /** Kind of the changed entry, when the change record carries a handle. */
  kind?: 'file' | 'directory';
}

/**
 * Best-effort rollback of a destination candidate. Without `expectedBytes`,
 * deletes only while the file is empty. With a snapshot, deletes only while
 * the bytes are unchanged. Swallows every failure so rollback never masks the
 * original error.
 */
async function removeEntryIfUnchanged(
  parent: FileSystemDirectoryHandle,
  handle: FileSystemFileHandle,
  expectedBytes?: ArrayBuffer,
): Promise<void> {
  try {
    const file = await handle.getFile();
    const unchanged =
      expectedBytes === undefined
        ? file.size === 0
        : bytesEqual(await file.arrayBuffer(), expectedBytes);
    if (unchanged) {
      await parent.removeEntry(handle.name);
    }
  } catch {
    // best effort
  }
}

const KNOWN_CHANGE_TYPES: readonly FileSystemChangeType[] = [
  'appeared',
  'disappeared',
  'modified',
  'moved',
  'unknown',
  'errored',
];

/**
 * A typed, root-relative filesystem over a `FileSystemDirectoryHandle`.
 *
 * - All paths are relative to the root handle (`"notes/todo.md"`); the root
 *   directory's own name never appears in a path.
 * - Every failure is a `NativeFsError` with a stable `code`, except aborts,
 *   which rethrow untouched so `isAbortError` keeps working.
 * - Reads require `read` permission, mutations require `readwrite`; neither
 *   ever prompts the user (see `requestPermission` for the gesture-bound
 *   prompt).
 * - Mutations are serialized cross-tab per path via the Web Locks API (when
 *   available) and use exclusive writables (when available) so a concurrent
 *   writer fails fast instead of silently winning by closing last.
 */
export class NativeFs {
  readonly rootHandle: FileSystemDirectoryHandle;
  private readonly lockScope: string;
  /** Memoized after the first TypeError from `createWritable({mode})`. */
  private exclusiveWritableUnsupported = false;

  constructor(opts: NativeFsOpts) {
    this.rootHandle = opts.rootHandle;
    this.lockScope = opts.lockScope ?? opts.rootHandle.name;
  }

  async exists(path: string): Promise<boolean> {
    return guardNativeFsOp(`exists "${path}"`, async () => {
      const segments = splitFilePath(path);
      await ensurePermission(this.rootHandle, 'read');
      try {
        await this.resolveFile(segments, { create: false });
        return true;
      } catch (error) {
        if (
          isNativeFsError(
            toNativeFsError(error, ''),
            NATIVE_FS_ERROR_CODE.notFound,
          )
        ) {
          return false;
        }
        throw error;
      }
    });
  }

  async stat(path: string): Promise<NativeFsStat> {
    return guardNativeFsOp(`stat "${path}"`, async () => {
      const file = await this.getFile(path);
      return { mtimeMs: file.lastModified, sizeBytes: file.size };
    });
  }

  /** Reads the file as a `File` (name, size, lastModified, streamable body). */
  async readFile(path: string): Promise<File> {
    return guardNativeFsOp(`readFile "${path}"`, () => this.getFile(path));
  }

  async readFileText(path: string): Promise<string> {
    return guardNativeFsOp(`readFileText "${path}"`, async () => {
      const file = await this.getFile(path);
      return file.text();
    });
  }

  /**
   * Creates a new file (and any missing parent directories), rejecting with
   * `alreadyExists` if the path is already taken.
   */
  async createFile(path: string, data: Blob): Promise<void> {
    return guardNativeFsOp(`createFile "${path}"`, async () => {
      const segments = splitFilePath(path);
      await ensurePermission(this.rootHandle, 'readwrite');
      await this.withExclusiveLocks([path], async () => {
        await this.writeWithCreateRollback(segments, data, {
          create: true,
          failIfTaken: true,
        });
      });
    });
  }

  /**
   * Writes (replaces) the file's content. With `create: true` (default) the
   * file and missing parents are created; with `create: false` a missing file
   * rejects with `notFound`.
   */
  async writeFile(
    path: string,
    data: Blob,
    opts: { create?: boolean } = {},
  ): Promise<void> {
    const { create = true } = opts;
    return guardNativeFsOp(`writeFile "${path}"`, async () => {
      const segments = splitFilePath(path);
      await ensurePermission(this.rootHandle, 'readwrite');
      await this.withExclusiveLocks([path], async () => {
        await this.writeWithCreateRollback(segments, data, { create });
      });
    });
  }

  /**
   * Resolves the file (creating it and missing parents when `create` is set
   * and it is absent) and writes `data` to it. When the write fails on an
   * entry this call itself created, the empty entry is removed again — a
   * failed create must not leave an empty file behind that shows up in
   * listings and blocks retries with `alreadyExists`.
   */
  private async writeWithCreateRollback(
    segments: readonly string[],
    data: Blob,
    opts: { create: boolean; failIfTaken?: boolean },
  ): Promise<void> {
    // A single probe doubles as the resolution for the existing-file case:
    // the overwrite path (every autosave) reuses the resolved handle instead
    // of walking the directory tree a second time.
    let resolved:
      | { parent: FileSystemDirectoryHandle; handle: FileSystemFileHandle }
      | undefined;
    try {
      resolved = await this.resolveFile(segments, { create: false });
    } catch (error) {
      if (
        !isNativeFsError(
          toNativeFsError(error, ''),
          NATIVE_FS_ERROR_CODE.notFound,
        )
      ) {
        throw error;
      }
    }
    const existed = resolved !== undefined;
    if (existed && opts.failIfTaken) {
      throw new NativeFsError({
        message: `Cannot create "${joinPath(segments)}": the file already exists`,
        code: NATIVE_FS_ERROR_CODE.alreadyExists,
      });
    }
    if (!existed && !opts.create) {
      throw new NativeFsError({
        message: `Cannot write "${joinPath(segments)}": the file does not exist`,
        code: NATIVE_FS_ERROR_CODE.notFound,
      });
    }

    const { parent, handle } =
      resolved ?? (await this.resolveFile(segments, { create: true }));
    if (!existed && opts.failIfTaken) {
      // Between the notFound probe and the create, an external writer (sync
      // tool, another program) can take this path; getFileHandle(create)
      // then returns THEIR file, not a fresh one. Web Locks only serialize
      // our own tabs. A freshly created entry is empty, so any bytes prove
      // the entry is not ours — honor create semantics instead of
      // overwriting it.
      const claimed = await handle.getFile();
      if (claimed.size > 0) {
        throw new NativeFsError({
          message: `Cannot create "${joinPath(segments)}": the file already exists`,
          code: NATIVE_FS_ERROR_CODE.alreadyExists,
        });
      }
    }
    try {
      await this.writeToHandle(handle, data);
    } catch (error) {
      if (!existed) {
        // Best effort: only remove an entry that is still empty. Non-empty
        // bytes prove an external writer took or changed the path.
        await removeEntryIfUnchanged(parent, handle);
      }
      throw error;
    }
  }

  /** Existence probe that treats only `notFound` as false. */
  private async fileEntryExists(segments: readonly string[]): Promise<boolean> {
    try {
      await this.resolveFile(segments, { create: false });
      return true;
    } catch (error) {
      if (
        isNativeFsError(
          toNativeFsError(error, ''),
          NATIVE_FS_ERROR_CODE.notFound,
        )
      ) {
        return false;
      }
      throw error;
    }
  }

  /** Deletes the file, rejecting with `notFound` if it does not exist. */
  async deleteFile(path: string): Promise<void> {
    return guardNativeFsOp(`deleteFile "${path}"`, async () => {
      const segments = splitFilePath(path);
      await ensurePermission(this.rootHandle, 'readwrite');
      await this.withExclusiveLocks([path], async () => {
        const { parent, handle } = await this.resolveFile(segments, {
          create: false,
        });
        await parent.removeEntry(handle.name);
      });
    });
  }

  /**
   * Moves/renames a file, rejecting with `alreadyExists` when the destination
   * is occupied at the preflight check. The browser's native move API has no
   * conditional/no-replace option, so an external program can still take the
   * destination in the final probe-to-move window; Web Locks cover app tabs,
   * not OS writers. Uses native move when available, otherwise falls back to
   * copy → verify destination → delete source, so the source is only removed
   * after the destination write is confirmed durable.
   */
  async moveFile(oldPath: string, newPath: string): Promise<void> {
    return guardNativeFsOp(
      `moveFile "${oldPath}" -> "${newPath}"`,
      async () => {
        const oldSegments = splitFilePath(oldPath);
        const newSegments = splitFilePath(newPath);
        if (oldPath === newPath) {
          throw new NativeFsError({
            message: `Cannot move "${oldPath}" onto itself`,
            code: NATIVE_FS_ERROR_CODE.invalidPath,
          });
        }
        await ensurePermission(this.rootHandle, 'readwrite');

        await this.withExclusiveLocks([oldPath, newPath], async () => {
          const source = await this.resolveFile(oldSegments, { create: false });

          let destinationTaken = true;
          try {
            await this.resolveFile(newSegments, { create: false });
          } catch (error) {
            if (
              !isNativeFsError(
                toNativeFsError(error, ''),
                NATIVE_FS_ERROR_CODE.notFound,
              )
            ) {
              throw error;
            }
            destinationTaken = false;
          }
          if (destinationTaken) {
            throw new NativeFsError({
              message: `Cannot move to "${newPath}": the file already exists`,
              code: NATIVE_FS_ERROR_CODE.alreadyExists,
            });
          }

          const newName = newSegments[newSegments.length - 1];
          if (newName === undefined) {
            throw new NativeFsError({
              message: `Invalid destination path "${newPath}"`,
              code: NATIVE_FS_ERROR_CODE.invalidPath,
            });
          }

          const nativeMove = (source.handle as MovableFileHandle).move;
          if (typeof nativeMove === 'function') {
            const destinationDir = await this.resolveDirectory(
              newSegments.slice(0, -1),
              { create: true },
            );
            try {
              await nativeMove.call(source.handle, destinationDir, newName);
              return;
            } catch (error) {
              // Rejection names for unsupported local moves vary across
              // engines, so fall back based on effects rather than names. The
              // fallback is safe only when the move provably did nothing.
              const sourceIntact = await this.fileEntryExists(oldSegments);
              const destinationAbsent =
                !(await this.fileEntryExists(newSegments));
              if (!sourceIntact || !destinationAbsent) {
                throw error;
              }
            }
          }

          // Fallback: copy, verify the destination write landed, then delete
          // the source. On any failure before the final delete the source file
          // is left untouched, and a destination entry this move created is
          // rolled back so the failed move does not leave an empty/corrupt
          // file that blocks a retry with `alreadyExists`.
          const sourceFile = await source.handle.getFile();
          const destination = await this.resolveFile(newSegments, {
            create: true,
          });
          // Same external-writer claim check as file creation: a freshly
          // created destination is empty; existing bytes mean another
          // program took the path between the probe and the create, and its
          // file must be neither overwritten nor rolled back.
          const claimed = await destination.handle.getFile();
          if (claimed.size > 0) {
            throw new NativeFsError({
              message: `Cannot move to "${newPath}": the file already exists`,
              code: NATIVE_FS_ERROR_CODE.alreadyExists,
            });
          }
          let rollbackSnapshot: ArrayBuffer | undefined;
          try {
            await this.writeToHandle(destination.handle, sourceFile);
            const written = await destination.handle.getFile();
            // Compare the actual bytes read back, not File.size metadata: a
            // same-length corrupt write must also keep the source. The source
            // is already fully in memory for the copy, so this does not raise
            // the peak memory beyond what copy-then-delete already requires.
            const [writtenBytes, sourceBytes] = await Promise.all([
              written.arrayBuffer(),
              sourceFile.arrayBuffer(),
            ]);
            rollbackSnapshot = writtenBytes;
            if (!bytesEqual(writtenBytes, sourceBytes)) {
              throw new NativeFsError({
                message: `Move verification failed for "${newPath}": the destination content does not match the source after writing. The source file was kept.`,
                code: NATIVE_FS_ERROR_CODE.moveVerificationFailed,
              });
            }
            // Deleting the source is part of the guarded scope: if it
            // fails (OS lock, permission change), leaving the copy behind
            // would strand a half-completed rename whose retry dies with
            // alreadyExists — so the destination copy is rolled back and
            // the move rejects with the source untouched.
            await source.parent.removeEntry(source.handle.name);
          } catch (error) {
            // Do not remove a destination that an external writer changed
            // after our write/verification. Before a snapshot exists, only an
            // empty entry is safe to clean up.
            await removeEntryIfUnchanged(
              destination.parent,
              destination.handle,
              rollbackSnapshot,
            );
            throw error;
          }
        });
      },
    );
  }

  /**
   * Recursively yields root-relative file paths in traversal order. Directory
   * and file filters are applied before descending, so an excluded
   * directory's subtree is never read. Aborting the signal throws the
   * original abort error mid-iteration.
   */
  async *iterFiles(opts: ListFilesOpts = {}): AsyncGenerator<string> {
    const { dirPath = '', signal, includeDirectory, includeFile } = opts;
    const segments = splitPath(dirPath);
    await ensurePermission(this.rootHandle, 'read');

    let startDir: FileSystemDirectoryHandle;
    try {
      startDir = await this.resolveDirectory(segments, { create: false });
    } catch (error) {
      throw toNativeFsError(error, `listFiles "${dirPath}"`);
    }

    yield* this.walkFiles(startDir, segments, {
      signal,
      includeDirectory,
      includeFile,
    });
  }

  /** Convenience wrapper collecting {@link iterFiles} into an array. */
  async listFiles(opts: ListFilesOpts = {}): Promise<string[]> {
    const result: string[] = [];
    for await (const path of this.iterFiles(opts)) {
      result.push(path);
    }
    return result;
  }

  /**
   * Observes external changes under the root via `FileSystemObserver`
   * (Chrome 133+ desktop). `armed` is false when the API is unavailable, so
   * callers can fall back to polling/manual refresh.
   *
   * Observation stops when `signal` aborts or when the returned `stop` is
   * called, whichever happens first. Callers that re-arm a watcher (e.g.
   * after an `errored` record) must `stop` the previous one, otherwise both
   * observers stay attached for the lifetime of `signal`.
   *
   * Change records from the OS can be coarse (`unknown` type, or `errored`
   * when observation breaks, e.g. on permission loss) — treat them as hints
   * to re-scan, not as authoritative facts.
   */
  async watch(
    onChanges: (changes: NativeFsChange[]) => void,
    opts: { signal: AbortSignal; recursive?: boolean },
  ): Promise<NativeFsWatchHandle> {
    const { signal, recursive = true } = opts;
    const ObserverCtor = (
      globalThis as { FileSystemObserver?: FileSystemObserverConstructor }
    ).FileSystemObserver;
    if (typeof ObserverCtor !== 'function' || signal.aborted) {
      return { armed: false, stop: () => {} };
    }

    return guardNativeFsOp('watch', async () => {
      await ensurePermission(this.rootHandle, 'read');
      const observer = new ObserverCtor((records) => {
        const changes = records.map((record) => mapChangeRecord(record));
        if (changes.length > 0) {
          onChanges(changes);
        }
      });
      let stopped = false;
      const stop = () => {
        if (stopped) {
          return;
        }
        stopped = true;
        signal.removeEventListener('abort', stop);
        observer.disconnect();
      };
      try {
        await observer.observe(this.rootHandle, { recursive });
      } catch (error) {
        observer.disconnect();
        throw error;
      }
      if (signal.aborted) {
        observer.disconnect();
        return { armed: false, stop: () => {} };
      }
      signal.addEventListener('abort', stop, { once: true });
      return { armed: true, stop };
    });
  }

  /** Escape hatch for callers that need the raw handle. */
  async getFileHandle(
    path: string,
    opts: { create?: boolean } = {},
  ): Promise<FileSystemFileHandle> {
    return guardNativeFsOp(`getFileHandle "${path}"`, async () => {
      const segments = splitFilePath(path);
      const { handle } = await this.resolveFile(segments, {
        create: opts.create ?? false,
      });
      return handle;
    });
  }

  /** Escape hatch for callers that need the raw handle. `''` is the root. */
  async getDirectoryHandle(
    path: string,
    opts: { create?: boolean } = {},
  ): Promise<FileSystemDirectoryHandle> {
    return guardNativeFsOp(`getDirectoryHandle "${path}"`, () =>
      this.resolveDirectory(splitPath(path), { create: opts.create ?? false }),
    );
  }

  // ---- internals ----

  private async getFile(path: string): Promise<File> {
    const segments = splitFilePath(path);
    await ensurePermission(this.rootHandle, 'read');
    const { handle } = await this.resolveFile(segments, { create: false });
    return handle.getFile();
  }

  private async resolveDirectory(
    segments: readonly string[],
    opts: { create: boolean },
  ): Promise<FileSystemDirectoryHandle> {
    let current = this.rootHandle;
    for (const segment of segments) {
      current = await current.getDirectoryHandle(segment, {
        create: opts.create,
      });
    }
    return current;
  }

  private async resolveFile(
    segments: readonly string[],
    opts: { create: boolean },
  ): Promise<{
    parent: FileSystemDirectoryHandle;
    handle: FileSystemFileHandle;
  }> {
    const name = segments[segments.length - 1];
    if (name === undefined) {
      throw new NativeFsError({
        message: 'Invalid file path: a file path cannot be empty',
        code: NATIVE_FS_ERROR_CODE.invalidPath,
      });
    }
    const parent = await this.resolveDirectory(segments.slice(0, -1), {
      create: opts.create,
    });
    const handle = await parent.getFileHandle(name, { create: opts.create });
    return { parent, handle };
  }

  private async writeToHandle(
    handle: FileSystemFileHandle,
    data: Blob,
  ): Promise<void> {
    const writable = await this.openWritable(handle);
    try {
      await writable.write(data);
    } catch (error) {
      // Abort the stream so the browser discards the temporary swap file
      // instead of committing a partial write on close.
      await writable.abort().catch(() => undefined);
      throw error;
    }
    await writable.close();
  }

  private async openWritable(
    handle: FileSystemFileHandle,
  ): Promise<FileSystemWritableFileStream> {
    if (this.exclusiveWritableUnsupported) {
      return handle.createWritable({ keepExistingData: false });
    }
    const exclusiveOpts: CreateWritableOpts = {
      keepExistingData: false,
      mode: 'exclusive',
    };
    try {
      return await handle.createWritable(
        exclusiveOpts as FileSystemCreateWritableOptions,
      );
    } catch (error) {
      // Engines that know the `mode` member but not the `exclusive` value
      // reject with a TypeError; retry in the default (siloed) mode and
      // remember the answer — support is an engine property, not a
      // per-file one, so there is no point re-asking on every write.
      if (error instanceof TypeError) {
        this.exclusiveWritableUnsupported = true;
        return handle.createWritable({ keepExistingData: false });
      }
      throw error;
    }
  }

  private async *walkFiles(
    dir: FileSystemDirectoryHandle,
    pathSegments: readonly string[],
    opts: {
      signal?: AbortSignal;
      includeDirectory?: (name: string) => boolean;
      includeFile?: (name: string) => boolean;
    },
  ): AsyncGenerator<string> {
    opts.signal?.throwIfAborted();
    try {
      for await (const entry of dir.values()) {
        // Checked per entry so an abort interrupts a walk part-way through a
        // single large directory, not only between directories.
        opts.signal?.throwIfAborted();
        if (entry.kind === 'file') {
          if (opts.includeFile?.(entry.name) ?? true) {
            yield joinPath([...pathSegments, entry.name]);
          }
          continue;
        }
        if (entry.kind === 'directory') {
          if (opts.includeDirectory?.(entry.name) ?? true) {
            yield* this.walkFiles(
              entry as FileSystemDirectoryHandle,
              [...pathSegments, entry.name],
              opts,
            );
          }
        }
      }
    } catch (error) {
      throw toNativeFsError(error, `listFiles "${joinPath(pathSegments)}"`);
    }
  }

  private async withExclusiveLocks<T>(
    paths: readonly string[],
    fn: () => Promise<T>,
  ): Promise<T> {
    const locks = (globalThis as { navigator?: { locks?: LockManager } })
      .navigator?.locks;
    if (!locks) {
      return fn();
    }
    // Lock keys are acquired in sorted order so two operations locking the
    // same pair of paths cannot deadlock each other.
    const keys = [...new Set(paths)]
      .sort()
      .map((p) => `native-fs:${this.lockScope}:${p}`);

    const acquire = async (index: number): Promise<T> => {
      const key = keys[index];
      if (key === undefined) {
        return fn();
      }
      return locks.request(key, { mode: 'exclusive' }, () =>
        acquire(index + 1),
      ) as Promise<T>;
    };
    return acquire(0);
  }
}

function isKnownChangeType(
  value: string | undefined,
): value is FileSystemChangeType {
  return (
    value !== undefined &&
    (KNOWN_CHANGE_TYPES as readonly string[]).includes(value)
  );
}

function mapChangeRecord(record: FileSystemChangeRecordLike): NativeFsChange {
  const type = isKnownChangeType(record.type) ? record.type : 'unknown';
  const movedFromPath = record.relativePathMovedFrom
    ? joinPath(record.relativePathMovedFrom)
    : undefined;
  const handleKind = record.changedHandle?.kind;
  const kind =
    handleKind === 'file' || handleKind === 'directory'
      ? handleKind
      : undefined;
  return {
    type,
    path: joinPath(record.relativePathComponents ?? []),
    ...(movedFromPath === undefined ? {} : { movedFromPath }),
    ...(kind === undefined ? {} : { kind }),
  };
}

function bytesEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  const viewA = new Uint8Array(a);
  const viewB = new Uint8Array(b);
  for (let index = 0; index < viewA.length; index++) {
    if (viewA[index] !== viewB[index]) {
      return false;
    }
  }
  return true;
}
