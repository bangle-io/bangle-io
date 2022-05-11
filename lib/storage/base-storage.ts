import { SpecRegistry } from '@bangle.dev/core';

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
  specRegistry: SpecRegistry;
  readWorkspaceMetadata: (wsName: string) => { [key: string]: any };
  updateWorkspaceMetadata: (
    wsName: string,
    metadata: { [key: string]: any },
  ) => void;
}

export interface BaseStorageProvider {
  readonly description: string;
  readonly displayName: string;
  // hide creating a workspace of this type
  readonly hidden?: boolean;
  readonly name: string;

  createFile(wsPath: WsPath, file: File, opts: StorageOpts): Promise<void>;

  deleteFile(wsPath: WsPath, opts: StorageOpts): Promise<void>;

  fileExists(wsPath: WsPath, opts: StorageOpts): Promise<boolean>;

  fileStat(wsPath: WsPath, opts: StorageOpts): Promise<FileStat>;

  readFile(wsPath: WsPath, opts: StorageOpts): Promise<File | undefined>;

  listAllFiles(
    abortSignal: AbortSignal,
    wsName: WsName,
    opts: StorageOpts,
  ): Promise<WsPath[]>;

  // return any metadata associated with this newly created workspace
  newWorkspaceMetadata(
    wsName: string,
    createOpts: any,
  ): Promise<{ [key: string]: any }> | Promise<void> | void;

  renameFile(
    wsPath: WsPath,
    newWsPath: WsPath,
    opts: StorageOpts,
  ): Promise<void>;

  writeFile(wsPath: WsPath, file: File, opts: StorageOpts): Promise<void>;

  searchFile?: (
    abortSignal: AbortSignal,
    query: { pattern: string },
    opts: StorageOpts,
  ) => Promise<WsPath[]>;

  searchText?: () => void;
}
