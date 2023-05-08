import type { SpecRegistry } from '@bangle.dev/core';

import type { StorageProviderOnChange } from '@bangle.io/shared-types';

export type WsPath = string;
export type WsName = string;

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

export interface StorageOpts {
  // TODO why do we need spec-registry here?
  specRegistry: SpecRegistry;
  readWorkspaceMetadata: (wsName: string) => Promise<{ [key: string]: any }>;
  updateWorkspaceMetadata: (
    wsName: string,
    metadata: { [key: string]: any },
  ) => Promise<void>;
}

export interface BaseStorageProvider {
  readonly description: string;
  readonly displayName: string;
  // hide creating a workspace of this type
  readonly hidden?: boolean;
  readonly name: string;

  onChange: StorageProviderOnChange;

  isSupported: () => boolean;

  // StorageProvider is run in various contexts like worker, main thread, etc.
  // This method will be called when an error needs to be serialized and forwarded to the main thread.
  serializeError: (error: Error) => string | undefined;
  parseError: (errorString: string) => Error | undefined;

  createFile: (wsPath: WsPath, file: File, opts: StorageOpts) => Promise<void>;

  deleteFile: (wsPath: WsPath, opts: StorageOpts) => Promise<void>;

  fileExists: (wsPath: WsPath, opts: StorageOpts) => Promise<boolean>;

  fileStat: (wsPath: WsPath, opts: StorageOpts) => Promise<FileStat>;

  readFile: (wsPath: WsPath, opts: StorageOpts) => Promise<File | undefined>;

  listAllFiles: (
    abortSignal: AbortSignal,
    wsName: WsName,
    opts: StorageOpts,
  ) => Promise<WsPath[]>;

  // return any metadata associated with this newly created workspace
  newWorkspaceMetadata: (
    wsName: string,
    createOpts: any,
  ) => Promise<{ [key: string]: any }> | Promise<void>;

  renameFile: (
    wsPath: WsPath,
    newWsPath: WsPath,
    opts: StorageOpts,
  ) => Promise<void>;

  /**
   * sha - gitsha of the file
   */
  writeFile: (
    wsPath: WsPath,
    file: File,
    opts: StorageOpts,
    sha?: string,
  ) => Promise<void>;

  searchFile?: (
    abortSignal: AbortSignal,
    query: { pattern: string },
    opts: StorageOpts,
  ) => Promise<WsPath[]>;

  searchText?: () => Promise<void>;
}
