import type { WorkspaceStorageType } from '@bangle.io/constants';

type WsPath = string;

export interface FileStat {
  /**
   * The creation timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  ctime: number;
  /**
   * The modification timestamp in milliseconds, if never modified this should match creation timestamp.
   */
  mtime: number;
}

export type FileStorageChangeEvent =
  | {
      type: 'create';
      wsPath: string;
    }
  | {
      type: 'delete';
      wsPath: string;
    }
  | {
      type: 'rename';
      oldWsPath: string;
      newWsPath: string;
    }
  | {
      type: 'update';
      wsPath: string;
    };

/**
 * A change made to workspace files by something other than this app instance
 * (a sync tool, another editor, a shell command), detected by a storage
 * provider's watcher. Per-path changes reuse the mutation event shape;
 * `refresh` is the coarse fallback when the watcher only knows "something
 * under this workspace changed".
 */
export type FileStorageExternalChangeEvent =
  | FileStorageChangeEvent
  | {
      type: 'refresh';
      wsName: string;
    };

type EmptyObject = Record<string, never>;

export interface BaseFileStorageProvider {
  readonly maxFileSizeBytes: number;
  readonly workspaceType: WorkspaceStorageType;

  /**
   * Creates a new file. Implementations must reject with
   * `error::file:already-existing` when the target exists and must not
   * overwrite existing content.
   */
  createFile: (
    wsPath: WsPath,
    file: File,
    options: EmptyObject,
  ) => Promise<void>;

  deleteFile: (wsPath: WsPath, options: EmptyObject) => Promise<void>;

  fileExists: (wsPath: WsPath, options: EmptyObject) => Promise<boolean>;

  fileStat: (wsPath: WsPath, options: EmptyObject) => Promise<FileStat>;

  readFile: (wsPath: WsPath, options: EmptyObject) => Promise<File | undefined>;

  listAllFiles: (
    wsName: string,
    abortSignal: AbortSignal,
    options: EmptyObject,
  ) => Promise<WsPath[]>;

  /**
   * Renames one file within its workspace without overwriting an existing
   * destination. Implementations must reject destination conflicts with
   * `error::file:already-existing` and cross-workspace renames with
   * `error::file:invalid-operation`.
   */
  renameFile: (
    wsPath: WsPath,
    options: {
      newWsPath: WsPath;
    },
  ) => Promise<void>;

  /**
   * sha - gitsha of the file
   */
  writeFile: (
    wsPath: WsPath,
    file: File,
    options: EmptyObject,
  ) => Promise<void>;
}
