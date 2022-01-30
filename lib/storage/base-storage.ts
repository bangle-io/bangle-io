import { SpecRegistry } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';

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
  formatSerializer: (doc: Node, specRegistry: SpecRegistry) => any;
  formatParser: (value: any, specRegistry: SpecRegistry) => Node;
  readWorkspaceMetadata: () => { [key: string]: any };
  updateWorkspaceMetadata: (metadata: { [key: string]: any }) => void;
}

export interface BaseStorageProvider {
  readonly name: string;
  readonly displayName: string;
  // hide creating a workspace of this type
  readonly hidden?: boolean;
  readonly description: string;

  // return any metadata associated with this newly created workspace
  newWorkspaceMetadata(
    wsName: string,
    createOpts: any,
  ): Promise<{ [key: string]: any }> | Promise<void> | void;

  fileExists(wsPath: WsPath, opts: StorageOpts): Promise<boolean>;

  fileStat(wsPath: WsPath, opts: StorageOpts): Promise<FileStat>;

  deleteFile(wsPath: WsPath, opts: StorageOpts): Promise<void>;

  getDoc(wsPath: WsPath, opts: StorageOpts): Promise<Node>;

  getFile(wsPath: WsPath, opts: StorageOpts): Promise<File>;

  listAllFiles(
    abortSignal: AbortSignal,
    wsName: WsName,
    opts: StorageOpts,
  ): Promise<WsPath[]>;

  saveDoc(wsPath: WsPath, doc: Node, opts: StorageOpts): Promise<void>;

  saveFile(wsPath: WsPath, file: File, opts: StorageOpts): Promise<void>;

  renameFile(
    wsPath: WsPath,
    newWsPath: WsPath,
    opts: StorageOpts,
  ): Promise<void>;

  searchFile?: (
    abortSignal: AbortSignal,
    query: { pattern: string },
    opts: StorageOpts,
  ) => Promise<WsPath[]>;

  searchText?: () => void;
}
