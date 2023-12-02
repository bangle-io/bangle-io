type WsPath = string;
type WsName = string;

interface FileStat {
  /**
   * The creation timestamp in milliseconds elapsed since January 1, 1970 00:00:00 UTC.
   */
  ctime: number;
  /**
   * The modification timestamp in milliseconds, if never modified this should match creation timestamp.
   */
  mtime: number;
}

export interface FileStorageOpts {
  wsName: WsName;
  isFileTypeSupported: (options: { extension: string }) => boolean;
  getWorkspaceMetadata: () => Promise<Record<string, any>>;
  updateWorkspaceMetadata: (
    metadata:
      | Record<string, any>
      | ((existingMetadata: Record<string, any>) => Record<string, any>),
  ) => Promise<void>;
  onChange: (event: FileStorageChangeEvent) => void;
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

type EmptyObject = Record<string, never>;

export interface BaseFileStorageProvider {
  readonly description: string;
  readonly displayName: string;
  // hide creating a workspace of this type
  readonly hidden?: boolean;
  readonly name: string;

  onInit: (options: FileStorageOpts) => void | Promise<void>;

  isSupported: () => boolean | Promise<boolean>;

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
    abortSignal: AbortSignal,
    options: EmptyObject,
  ) => Promise<WsPath[]>;

  // return any metadata associated with this newly created workspace
  onNewWorkspace: (
    wsName: string,
    options: Record<string, unknown>,
  ) => void | Promise<void>;

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
    options: {
      sha?: string;
    },
  ) => Promise<void>;

  searchFile?: (
    abortSignal: AbortSignal,
    options: {
      query: { pattern: string };
    },
  ) => Promise<WsPath[]>;

  searchText?: () => Promise<void>;
}
