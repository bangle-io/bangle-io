import {
  assertIsDefined,
  BaseService,
  type BaseServiceContext,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  EXTERNAL_FILE_CHANGE_SENDER_TAG,
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
  type WorkspaceStorageType,
} from '@bangle.io/constants';
import type {
  BaseFileStorageService,
  FileStat,
  ScopedEmitter,
} from '@bangle.io/types';
import { isVisibleWorkspaceFilePath, WsPath } from '@bangle.io/ws-path';
import { atom } from 'jotai';
import type { NoteSnapshotService } from './note-snapshot-service';
import type { WorkspaceOpsService } from './workspace-ops-service';

type ChangeEvent = {
  type: 'file-create' | 'file-content-update' | 'file-delete' | 'file-rename';
  payload: { oldWsPath?: string; wsPath: string };
};

export type FileContentUpdateEvent = {
  sequence: number;
  wsPath: string;
};

export type FileCreateEvent = {
  sequence: number;
  wsPath: string;
};

export type FileRenameEvent = {
  oldWsPath: string;
  sequence: number;
  wsPath: string;
};

/**
 * A file change that did NOT originate from this app's own writes — detected
 * by a storage watcher (e.g. a sync tool editing a Native FS workspace) or
 * broadcast from another tab's watcher. `refresh` means "something changed,
 * re-read what you depend on" without a specific path.
 */
export type ExternalFileChangeEvent = {
  sequence: number;
  type:
    | 'file-create'
    | 'file-content-update'
    | 'file-delete'
    | 'file-rename'
    | 'refresh';
  wsPath?: string;
  /** For `refresh`: the workspace the refresh concerns; absent = app-wide. */
  wsName?: string;
};

type FileReadOptions = {
  signal?: AbortSignal;
};

type RenameFilePair = {
  oldWsPath: string;
  newWsPath: string;
};

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason ?? new Error('Operation aborted');
  }
}

/**
 * Provides file system operations (list, read, write, rename, delete files)
 */
export class FileSystemService extends BaseService {
  static deps = ['workspaceOps', 'noteSnapshot'] as const;

  $fileCreateCount = atom(0);
  $fileContentUpdateCount = atom(0);
  $fileDeleteCount = atom(0);
  $fileRenameCount = atom(0);
  $fileForceUpdateCount = atom(0);
  $fileCreateEvent = atom<FileCreateEvent | undefined>(undefined);
  $fileContentUpdateEvent = atom<FileContentUpdateEvent | undefined>(undefined);
  $fileRenameEvent = atom<FileRenameEvent | undefined>(undefined);
  $externalFileChangeEvent = atom<ExternalFileChangeEvent | undefined>(
    undefined,
  );

  private fileCreateSequence = 0;
  private fileContentUpdateSequence = 0;
  private fileRenameSequence = 0;
  private externalFileChangeSequence = 0;

  $fileTreeChangeCount = atom((get) => {
    return (
      get(this.$fileDeleteCount) +
      get(this.$fileRenameCount) +
      get(this.$fileForceUpdateCount)
    );
  });
  $fileListRevisionCount = atom((get) => {
    return get(this.$fileCreateCount) + get(this.$fileTreeChangeCount);
  });

  constructor(
    context: BaseServiceContext,
    private dependencies: {
      workspaceOps: WorkspaceOpsService;
      noteSnapshot: NoteSnapshotService;
    },
    private config: {
      emitter: ScopedEmitter<'event::file:update' | 'event::file:force-update'>;
      getFileStorageServices: () => Record<string, BaseFileStorageService>;
    },
  ) {
    super(SERVICE_NAME.fileSystemService, context, dependencies);
  }

  async hookMount(): Promise<void> {
    assertIsDefined(
      this.config.getFileStorageServices(),
      'fileStorageServices',
    );

    this.config.emitter.on(
      'event::file:force-update',
      (event) => {
        this.store.set(this.$fileCreateCount, (c) => c + 1);
        this.store.set(this.$fileContentUpdateCount, (c) => c + 1);
        this.store.set(this.$fileDeleteCount, (c) => c + 1);
        this.store.set(this.$fileRenameCount, (c) => c + 1);
        this.store.set(this.$fileForceUpdateCount, (c) => c + 1);
        if (event.sender.tag === EXTERNAL_FILE_CHANGE_SENDER_TAG) {
          this.setExternalFileChangeEvent({
            type: 'refresh',
            wsName: event.wsName,
          });
        }
      },
      this.abortSignal,
    );

    this.config.emitter.on(
      'event::file:update',
      (event) => {
        if (event.sender.tag === EXTERNAL_FILE_CHANGE_SENDER_TAG) {
          this.setExternalFileChangeEvent({
            type: event.type,
            wsPath: event.wsPath,
          });
        }
        switch (event.type) {
          case 'file-create': {
            this.store.set(this.$fileCreateCount, (c) => c + 1);
            this.fileCreateSequence += 1;
            this.store.set(this.$fileCreateEvent, {
              sequence: this.fileCreateSequence,
              wsPath: event.wsPath,
            });
            break;
          }
          case 'file-content-update': {
            this.store.set(this.$fileContentUpdateCount, (c) => c + 1);
            this.fileContentUpdateSequence += 1;
            this.store.set(this.$fileContentUpdateEvent, {
              sequence: this.fileContentUpdateSequence,
              wsPath: event.wsPath,
            });
            break;
          }
          case 'file-delete': {
            this.store.set(this.$fileDeleteCount, (c) => c + 1);
            break;
          }
          case 'file-rename': {
            if (event.oldWsPath) {
              this.fileRenameSequence += 1;
              this.store.set(this.$fileRenameEvent, {
                oldWsPath: event.oldWsPath,
                sequence: this.fileRenameSequence,
                wsPath: event.wsPath,
              });
            }
            this.store.set(this.$fileRenameCount, (c) => c + 1);
            break;
          }
          default: {
            const _exhaustiveCheck: never = event.type;
          }
        }
      },
      this.abortSignal,
    );
  }

  private setExternalFileChangeEvent(
    event: Omit<ExternalFileChangeEvent, 'sequence'>,
  ): void {
    this.externalFileChangeSequence += 1;
    this.store.set(this.$externalFileChangeEvent, {
      sequence: this.externalFileChangeSequence,
      ...event,
    });
  }

  private isWorkspaceFileVisible(wsPath: string) {
    return isVisibleWorkspaceFilePath(wsPath);
  }

  /**
   * Triggers a rescan of the workspace file listing without touching open
   * editors. Used to recover after a failed file tree scan.
   */
  public refreshFileTree(): void {
    this.store.set(this.$fileForceUpdateCount, (count) => count + 1);
  }

  /**
   * Lists supported visible workspace files, including notes, assets, and other
   * files that the workspace UI can show.
   */
  public async listWorkspaceFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    return this.listWorkspaceFilesWithFilter(wsName, abortSignal, (filePath) =>
      isVisibleWorkspaceFilePath(filePath.wsPath),
    );
  }

  /**
   * Lists supported visible Markdown notes only.
   */
  public async listNoteFiles(
    wsName: string,
    abortSignal: AbortSignal = new AbortController().signal,
  ): Promise<string[]> {
    return this.listWorkspaceFilesWithFilter(
      wsName,
      abortSignal,
      (filePath) =>
        filePath.isNote() && isVisibleWorkspaceFilePath(filePath.wsPath),
    );
  }

  private async listWorkspaceFilesWithFilter(
    wsName: string,
    abortSignal: AbortSignal,
    predicate: (filePath: ReturnType<typeof WsPath.assertFile>) => boolean,
  ): Promise<string[]> {
    await this.mountPromise;
    // A dummy path is used to identify the correct storage service for this workspace.
    const dummyWsPath = WsPath.fromParts(wsName, '').wsPath;
    const storageService = await this.getStorageService({
      wsPath: dummyWsPath,
    });

    let wsPaths = await storageService.listAllFiles(wsName, abortSignal, {});
    wsPaths = wsPaths.filter((r) => {
      const result = WsPath.safeParse(r);
      if (!result.ok) {
        this.logger.warn(
          `listWorkspaceFiles: Ignoring file "${r}" as it is not a valid wsPath`,
        );
        return false;
      }
      const wsPath = result.data;
      const filePath = wsPath?.asFile();
      if (!filePath) {
        this.logger.warn(
          `listWorkspaceFiles: Ignoring file "${r}" as it is not a file path`,
        );
        return false;
      }
      const isSupported = predicate(filePath);

      if (!isSupported) {
        this.logger.warn(
          `listWorkspaceFiles: Ignoring file "${r}" as it is not supported`,
        );
      }
      return isSupported;
    });

    return wsPaths;
  }

  public async readFile(
    wsPath: string,
    options: FileReadOptions = {},
  ): Promise<File | undefined> {
    throwIfAborted(options.signal);
    await this.mountPromise;
    throwIfAborted(options.signal);
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    throwIfAborted(options.signal);
    const file = await storageService.readFile(wsPath, {});
    throwIfAborted(options.signal);
    return file;
  }

  public async readFileAsText(
    wsPath: string,
    options: FileReadOptions = {},
  ): Promise<string | undefined> {
    const file = await this.readFile(wsPath, options);
    if (!file) {
      return undefined;
    }
    const text = await file.text();
    throwIfAborted(options.signal);
    return text;
  }

  /**
   * Returns creation/modification timestamps for a file. Read-only: never
   * writes anything back to storage.
   */
  public async fileStat(
    wsPath: string,
    options: FileReadOptions = {},
  ): Promise<FileStat> {
    throwIfAborted(options.signal);
    await this.mountPromise;
    throwIfAborted(options.signal);
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    throwIfAborted(options.signal);
    const stat = await storageService.fileStat(wsPath, {});
    throwIfAborted(options.signal);
    return stat;
  }

  /**
   * Checks if a file exists at the given wsPath
   */
  public async exists(wsPath: string): Promise<boolean> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    return storageService.fileExists(wsPath, {});
  }

  public async getMaxFileSizeBytes(wsPath: string): Promise<number> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    return storageService.maxFileSizeBytes;
  }

  private async assertFileSizeWithinProviderLimit(
    wsPath: string,
    file: File,
    storageService: BaseFileStorageService,
  ): Promise<void> {
    const fileSizeBytes = file.size;
    if (
      !Number.isFinite(fileSizeBytes) ||
      fileSizeBytes <= storageService.maxFileSizeBytes
    ) {
      return;
    }

    throwAppError(
      'error::file:size-too-large',
      'File is too large for this workspace storage provider',
      {
        fileName: file.name || WsPath.assertFile(wsPath).fileName,
        fileSizeBytes,
        maxFileSizeBytes: storageService.maxFileSizeBytes,
        wsPath,
      },
    );
  }

  public async createFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    await this.assertFileSizeWithinProviderLimit(wsPath, file, storageService);
    await storageService.createFile(wsPath, file, {});
    this.onChange({
      type: 'file-create',
      payload: { wsPath },
    });
  }

  public async createTextFile(wsPath: string, text: string): Promise<void> {
    await this.mountPromise;
    const fileWsPath = WsPath.assertFile(wsPath);
    await this.createFile(
      wsPath,
      new File([text], fileWsPath.fileNameWithoutExtension, {
        type: 'text/plain',
      }),
    );
  }

  public async writeFile(wsPath: string, file: File): Promise<void> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    const storageService = await this.getStorageService({ wsPath });
    // Preserve a recovery copy of the content that is about to be replaced.
    // Throttled internally (usually a no-op) and never throws. When capture
    // is due, it finishes before the overwrite so the recovery copy cannot
    // race the destructive write.
    const [outgoingContent] = await Promise.all([
      this.dependencies.noteSnapshot.prepareOutgoingWrite(wsPath, file),
      this.dependencies.noteSnapshot.captureBeforeOverwrite(wsPath, () =>
        storageService.readFile(wsPath, {}),
      ),
    ]);
    await storageService.writeFile(wsPath, file, {});
    // Remember what this tab wrote (in memory only) so the content can be
    // preserved as a snapshot if another tab overwrites it.
    this.dependencies.noteSnapshot.recordOutgoingWrite(wsPath, outgoingContent);
    this.onChange({
      type: 'file-content-update',
      payload: { wsPath },
    });
  }

  // Storage-only primitives (no change emission). Batch operations use these so
  // they can perform every durable write first and then announce the changes in
  // a single synchronous burst — see `deleteFiles`/`renameFiles`.
  private async deleteFileFromStorage(wsPath: string): Promise<void> {
    const storageService = await this.getStorageService({ wsPath });
    await storageService.deleteFile(wsPath, {});
  }

  private async createFileInStorage(wsPath: string, file: File): Promise<void> {
    const storageService = await this.getStorageService({ wsPath });
    await storageService.createFile(wsPath, file, {});
  }

  public async deleteFile(wsPath: string): Promise<void> {
    await this.mountPromise;
    WsPath.assertFile(wsPath);

    await this.deleteFileFromStorage(wsPath);
    this.onChange({
      type: 'file-delete',
      payload: { wsPath },
    });
  }

  public async deleteFiles(wsPaths: readonly string[]): Promise<void> {
    await this.mountPromise;
    const files = await Promise.all(
      wsPaths.map(async (wsPath) => {
        WsPath.assertFile(wsPath);
        const file = await this.readFile(wsPath);

        if (!file) {
          throwAppError(
            'error::file:invalid-note-path',
            'Cannot delete missing file',
            {
              invalidWsPath: wsPath,
            },
          );
        }

        return { file, wsPath };
      }),
    );

    const deleted: Array<{ file: File; wsPath: string }> = [];

    try {
      for (const entry of files) {
        await this.deleteFileFromStorage(entry.wsPath);
        deleted.push(entry);
      }
    } catch (error) {
      // Restore anything already removed so a partial batch never loses data.
      for (const entry of [...deleted].reverse()) {
        if (!(await this.exists(entry.wsPath))) {
          await this.createFileInStorage(entry.wsPath, entry.file);
        }
      }
      // No change was announced mid-batch and the rollback returns storage to
      // its pre-batch state, so the tree is already consistent — nothing to emit.
      throw error;
    }

    // Announce every deletion synchronously so the workspace re-lists exactly
    // once for the whole batch instead of once per file (Jotai batches the
    // synchronous counter writes into a single re-scan).
    for (const entry of deleted) {
      this.onChange({ type: 'file-delete', payload: { wsPath: entry.wsPath } });
    }
  }

  public async renameFile({
    oldWsPath,
    newWsPath,
  }: RenameFilePair): Promise<void> {
    await this.mountPromise;

    const oldPath = WsPath.fromString(oldWsPath).asFile();
    const newPath = WsPath.fromString(newWsPath).asFile();

    if (!oldPath || !newPath) {
      throwAppError(
        'error::file:invalid-operation',
        'Invalid file paths provided',
        {
          operation: 'rename',
          oldWsPath,
          newWsPath,
        },
      );
    }

    if (oldPath.wsName !== newPath.wsName) {
      throwAppError(
        'error::file:invalid-operation',
        'Cannot rename file across different workspaces',
        {
          operation: 'rename',
          oldWsPath,
          newWsPath,
        },
      );
    }

    await this.renameFileInStorage(oldWsPath, newWsPath);
    this.onChange({
      type: 'file-rename',
      payload: { oldWsPath, wsPath: newWsPath },
    });
  }

  private async renameFileInStorage(
    oldWsPath: string,
    newWsPath: string,
  ): Promise<void> {
    const storageService = await this.getStorageService({ wsPath: oldWsPath });
    await storageService.renameFile(oldWsPath, { newWsPath });
  }

  public async renameFiles(pairs: readonly RenameFilePair[]): Promise<void> {
    await this.mountPromise;
    const oldPathSet = new Set(pairs.map((pair) => pair.oldWsPath));

    await Promise.all(
      pairs.map(async ({ oldWsPath, newWsPath }) => {
        const oldPath = WsPath.assertFile(oldWsPath);
        const newPath = WsPath.assertFile(newWsPath);

        if (oldPath.wsName !== newPath.wsName) {
          throwAppError(
            'error::file:invalid-operation',
            'Cannot rename file across different workspaces',
            {
              operation: 'rename',
              oldWsPath,
              newWsPath,
            },
          );
        }

        if (!(await this.exists(oldWsPath))) {
          throwAppError(
            'error::file:invalid-note-path',
            'Cannot rename missing file',
            {
              invalidWsPath: oldWsPath,
            },
          );
        }

        if ((await this.exists(newWsPath)) && !oldPathSet.has(newWsPath)) {
          throwAppError('error::file:already-existing', 'File already exists', {
            wsPath: newWsPath,
          });
        }
      }),
    );

    const renamed: RenameFilePair[] = [];

    try {
      for (const pair of pairs) {
        await this.renameFileInStorage(pair.oldWsPath, pair.newWsPath);
        renamed.push(pair);
      }
    } catch (error) {
      // Reverse the renames that already landed so a partial batch never leaves
      // notes stranded under half-applied paths.
      for (const pair of [...renamed].reverse()) {
        if (await this.exists(pair.newWsPath)) {
          await this.renameFileInStorage(pair.newWsPath, pair.oldWsPath);
        }
      }
      throw error;
    }

    // Announce every rename synchronously so the workspace re-lists exactly once
    // for the whole batch instead of once per file.
    for (const pair of renamed) {
      this.onChange({
        type: 'file-rename',
        payload: { oldWsPath: pair.oldWsPath, wsPath: pair.newWsPath },
      });
    }
  }

  static _getStorageServiceForType(
    wsInfoType: WorkspaceStorageType,
    fileStorageServices: Record<string, BaseFileStorageService>,
    wsName: string,
  ): BaseFileStorageService {
    const getDep = (type: WorkspaceStorageType): BaseFileStorageService => {
      const result = fileStorageServices[type];
      assertIsDefined(result);
      return result;
    };

    switch (wsInfoType) {
      case WORKSPACE_STORAGE_TYPE.Browser: {
        return getDep(WORKSPACE_STORAGE_TYPE.Browser);
      }
      case WORKSPACE_STORAGE_TYPE.NativeFS: {
        return getDep(WORKSPACE_STORAGE_TYPE.NativeFS);
      }
      case WORKSPACE_STORAGE_TYPE.Memory: {
        return getDep(WORKSPACE_STORAGE_TYPE.Memory);
      }
      case WORKSPACE_STORAGE_TYPE.Help:
      case WORKSPACE_STORAGE_TYPE.PrivateFS:
      case WORKSPACE_STORAGE_TYPE.Github: {
        throwAppError(
          'error::workspace:unknown-ws-type',
          `${wsInfoType} workspace is not supported for file operations`,
          { wsName, type: wsInfoType },
        );
        break;
      }
      default: {
        const _exhaustiveCheck: never = wsInfoType;
        throwAppError(
          'error::workspace:unknown-ws-type',
          `${wsInfoType} workspace is not supported for file operations`,
          { wsName, type: wsInfoType },
        );
      }
    }
  }

  private async getStorageService({
    wsPath,
  }: {
    wsPath: string;
  }): Promise<BaseFileStorageService> {
    await this.mountPromise;
    const wsName = WsPath.fromString(wsPath).wsName;
    const wsInfo =
      await this.dependencies.workspaceOps.getWorkspaceInfo(wsName);
    if (!wsInfo) {
      throwAppError(
        'error::workspace:not-found',
        `Workspace not found: ${wsName}`,
        {
          wsName,
        },
      );
    }
    const wsInfoType = wsInfo.type as WorkspaceStorageType;
    return FileSystemService._getStorageServiceForType(
      wsInfoType,
      this.config.getFileStorageServices(),
      wsName,
    );
  }

  private onChange(change: ChangeEvent) {
    this.config.emitter.emit('event::file:update', {
      type: change.type,
      ...change.payload,
      sender: getEventSenderMetadata({ tag: this.name }),
    });
  }
}
