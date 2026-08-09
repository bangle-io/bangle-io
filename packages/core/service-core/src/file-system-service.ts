import {
  assertIsDefined,
  BaseService,
  type BaseServiceContext,
  classifyEventSender,
  getEventSenderMetadata,
  throwAppError,
} from '@bangle.io/base-utils';
import {
  SERVICE_NAME,
  WORKSPACE_STORAGE_TYPE,
  type WorkspaceStorageType,
} from '@bangle.io/constants';
import type {
  BaseFileStorageService,
  EventSenderMetadata,
  FileStat,
  ScopedEmitter,
} from '@bangle.io/types';
import { isVisibleWorkspaceFilePath, WsPath } from '@bangle.io/ws-path';
import { atom } from 'jotai';
import {
  type CompensatedFileBatchOutcome,
  createCompensatedFileBatchError,
  type FileBatchCompensationResult,
  runCompensatedFileBatch,
} from './compensated-file-batch';
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
  external: boolean;
  oldWsPath: string;
  sequence: number;
  wsPath: string;
};

/**
 * A file change that did NOT originate from this browsing context — detected
 * by a storage watcher (e.g. a sync tool editing a Native FS workspace) or
 * broadcast from another tab. `refresh` means "something changed, re-read
 * what you depend on" without a specific path.
 */
type ExternalFileChangePayload =
  | {
      type: 'file-create' | 'file-content-update' | 'file-delete';
      wsPath: string;
    }
  | {
      type: 'refresh';
      /** The workspace the refresh concerns; absent = app-wide. */
      wsName?: string;
    };

export type ExternalFileChangeEvent = {
  sequence: number;
} & ExternalFileChangePayload;

type FileReadOptions = {
  signal?: AbortSignal;
};

type RenameFilePair = {
  oldWsPath: string;
  newWsPath: string;
};

type DeleteFileBatchEntry = {
  file: File;
  storageService: BaseFileStorageService;
  wsPath: string;
};

type RenameFileBatchEntry = RenameFilePair & {
  file: File;
  storageService: BaseFileStorageService;
};

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw signal.reason ?? new Error('Operation aborted');
  }
}

function throwInvalidFileBatch(
  operation: 'delete' | 'rename',
  message: string,
  oldWsPath: string,
  newWsPath: string,
): never {
  throwAppError('error::file:invalid-operation', message, {
    operation: `${operation}-batch`,
    oldWsPath,
    newWsPath,
  });
}

async function fileContentsMatch(first: File, second: File): Promise<boolean> {
  if (first.size !== second.size) {
    return false;
  }

  const [firstBytes, secondBytes] = await Promise.all([
    first.arrayBuffer(),
    second.arrayBuffer(),
  ]);
  const firstView = new Uint8Array(firstBytes);
  const secondView = new Uint8Array(secondBytes);

  return firstView.every((value, index) => value === secondView[index]);
}

function uncertainCompensation(message: string): FileBatchCompensationResult {
  return { error: new Error(message), status: 'uncertain' };
}

function batchWorkspaceName(wsPaths: readonly string[]): string | undefined {
  let sharedWsName: string | undefined;

  for (const wsPath of wsPaths) {
    const wsName = WsPath.assertFile(wsPath).wsName;
    if (sharedWsName === undefined) {
      sharedWsName = wsName;
    } else if (sharedWsName !== wsName) {
      return undefined;
    }
  }

  return sharedWsName;
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
      /** This browsing context's event-sender id (BROWSING_CONTEXT_ID). */
      selfSenderId: string;
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
        if (this.isExternalSender(event.sender)) {
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
        const isExternal = this.isExternalSender(event.sender);
        if (isExternal && event.type !== 'file-rename') {
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
            // Observers cannot distinguish a new path from an atomic
            // temp-to-target replacement. External creates therefore also
            // invalidate indexes derived from file content.
            if (isExternal) {
              this.recordFileContentUpdate(event.wsPath);
            }
            break;
          }
          case 'file-content-update': {
            this.recordFileContentUpdate(event.wsPath);
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
                external: isExternal,
                oldWsPath: event.oldWsPath,
                sequence: this.fileRenameSequence,
                wsPath: event.wsPath,
              });
            }
            this.store.set(this.$fileRenameCount, (c) => c + 1);
            if (isExternal) {
              // $fileRenameEvent retargets editors when the origin is known.
              // A coarse refresh then reconciles their content and also
              // covers origin-less rename events.
              this.setExternalFileChangeEvent({
                type: 'refresh',
                wsName: WsPath.safeParse(event.wsPath).data?.wsName,
              });
            }
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

  private isExternalSender(sender: EventSenderMetadata): boolean {
    return classifyEventSender(sender, this.config.selfSenderId).external;
  }

  private setExternalFileChangeEvent(event: ExternalFileChangePayload): void {
    this.externalFileChangeSequence += 1;
    this.store.set(this.$externalFileChangeEvent, {
      sequence: this.externalFileChangeSequence,
      ...event,
    });
  }

  private recordFileContentUpdate(wsPath: string): void {
    this.store.set(this.$fileContentUpdateCount, (count) => count + 1);
    this.fileContentUpdateSequence += 1;
    this.store.set(this.$fileContentUpdateEvent, {
      sequence: this.fileContentUpdateSequence,
      wsPath,
    });
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

  // Storage-only primitive (no change emission).
  private async deleteFileFromStorage(wsPath: string): Promise<void> {
    const storageService = await this.getStorageService({ wsPath });
    await storageService.deleteFile(wsPath, {});
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
    const sourcePaths = new Set<string>();
    for (const wsPath of wsPaths) {
      const filePath = WsPath.assertFile(wsPath);
      if (sourcePaths.has(filePath.wsPath)) {
        throwInvalidFileBatch(
          'delete',
          'Cannot delete the same file more than once in a batch',
          filePath.wsPath,
          filePath.wsPath,
        );
      }
      sourcePaths.add(filePath.wsPath);
    }

    const files = await Promise.all(
      wsPaths.map(async (wsPath) => {
        const storageService = await this.getStorageService({ wsPath });
        const file = await storageService.readFile(wsPath, {});

        if (!file) {
          throwAppError(
            'error::file:invalid-note-path',
            'Cannot delete missing file',
            {
              invalidWsPath: wsPath,
            },
          );
        }

        return { file, storageService, wsPath };
      }),
    );

    const outcome = await runCompensatedFileBatch(files, {
      apply: (entry) => entry.storageService.deleteFile(entry.wsPath, {}),
      compensate: (entry) => this.restoreDeletedBatchEntry(entry),
      describe: (entry) => ({ sourceWsPath: entry.wsPath }),
    });
    this.handleCompensatedFileBatchOutcome(
      outcome,
      'delete',
      batchWorkspaceName(wsPaths),
    );

    // Announce every deletion synchronously so the workspace re-lists exactly
    // once for the whole batch instead of once per file (Jotai batches the
    // synchronous counter writes into a single re-scan).
    for (const entry of files) {
      this.onChange({ type: 'file-delete', payload: { wsPath: entry.wsPath } });
    }
  }

  private async restoreDeletedBatchEntry(
    entry: DeleteFileBatchEntry,
  ): Promise<FileBatchCompensationResult> {
    const existingFile = await entry.storageService.readFile(entry.wsPath, {});
    if (existingFile) {
      return (await fileContentsMatch(existingFile, entry.file))
        ? { status: 'restored' }
        : uncertainCompensation(
            `Delete rollback found different content at ${entry.wsPath}`,
          );
    }

    // createFile is deliberately used instead of writeFile: every provider's
    // contract rejects a concurrent replacement rather than overwriting it.
    await entry.storageService.createFile(entry.wsPath, entry.file, {});
    const restoredFile = await entry.storageService.readFile(entry.wsPath, {});
    if (restoredFile && (await fileContentsMatch(restoredFile, entry.file))) {
      return { status: 'restored' };
    }

    return uncertainCompensation(
      `Delete rollback could not verify restored content at ${entry.wsPath}`,
    );
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
    const oldPathSet = new Set<string>();
    const newPathSet = new Set<string>();

    for (const { oldWsPath, newWsPath } of pairs) {
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

      if (oldPathSet.has(oldPath.wsPath)) {
        throwInvalidFileBatch(
          'rename',
          'Cannot rename the same source more than once in a batch',
          oldPath.wsPath,
          newPath.wsPath,
        );
      }
      if (newPathSet.has(newPath.wsPath)) {
        throwInvalidFileBatch(
          'rename',
          'Cannot use the same destination more than once in a batch',
          oldPath.wsPath,
          newPath.wsPath,
        );
      }

      oldPathSet.add(oldPath.wsPath);
      newPathSet.add(newPath.wsPath);
    }

    for (const { oldWsPath, newWsPath } of pairs) {
      if (oldPathSet.has(WsPath.assertFile(newWsPath).wsPath)) {
        throwInvalidFileBatch(
          'rename',
          'Rename batches cannot depend on another source path',
          oldWsPath,
          newWsPath,
        );
      }
    }

    const entries = await Promise.all(
      pairs.map(async ({ oldWsPath, newWsPath }) => {
        const storageService = await this.getStorageService({
          wsPath: oldWsPath,
        });
        const [file, destinationExists] = await Promise.all([
          storageService.readFile(oldWsPath, {}),
          storageService.fileExists(newWsPath, {}),
        ]);

        if (!file) {
          throwAppError(
            'error::file:invalid-note-path',
            'Cannot rename missing file',
            {
              invalidWsPath: oldWsPath,
            },
          );
        }

        if (destinationExists) {
          throwAppError('error::file:already-existing', 'File already exists', {
            wsPath: newWsPath,
          });
        }

        return { file, newWsPath, oldWsPath, storageService };
      }),
    );

    const outcome = await runCompensatedFileBatch(entries, {
      apply: (entry) =>
        entry.storageService.renameFile(entry.oldWsPath, {
          newWsPath: entry.newWsPath,
        }),
      compensate: (entry) => this.restoreRenamedBatchEntry(entry),
      describe: (entry) => ({
        destinationWsPath: entry.newWsPath,
        sourceWsPath: entry.oldWsPath,
      }),
    });
    this.handleCompensatedFileBatchOutcome(
      outcome,
      'rename',
      batchWorkspaceName(pairs.map((pair) => pair.oldWsPath)),
    );

    // Announce every rename synchronously so the workspace re-lists exactly once
    // for the whole batch instead of once per file.
    for (const pair of pairs) {
      this.onChange({
        type: 'file-rename',
        payload: { oldWsPath: pair.oldWsPath, wsPath: pair.newWsPath },
      });
    }
  }

  private async restoreRenamedBatchEntry(
    entry: RenameFileBatchEntry,
  ): Promise<FileBatchCompensationResult> {
    const [sourceFile, destinationFile] = await Promise.all([
      entry.storageService.readFile(entry.oldWsPath, {}),
      entry.storageService.readFile(entry.newWsPath, {}),
    ]);

    if (sourceFile) {
      if (destinationFile) {
        return uncertainCompensation(
          `Rename rollback found both ${entry.oldWsPath} and ${entry.newWsPath}`,
        );
      }

      return (await fileContentsMatch(sourceFile, entry.file))
        ? { status: 'restored' }
        : uncertainCompensation(
            `Rename rollback found different content at ${entry.oldWsPath}`,
          );
    }

    if (!destinationFile) {
      return uncertainCompensation(
        `Rename rollback could not find ${entry.oldWsPath} or ${entry.newWsPath}`,
      );
    }

    if (!(await fileContentsMatch(destinationFile, entry.file))) {
      return uncertainCompensation(
        `Rename rollback found different content at ${entry.newWsPath}`,
      );
    }

    await entry.storageService.renameFile(entry.newWsPath, {
      newWsPath: entry.oldWsPath,
    });
    const [restoredSource, remainingDestination] = await Promise.all([
      entry.storageService.readFile(entry.oldWsPath, {}),
      entry.storageService.readFile(entry.newWsPath, {}),
    ]);

    if (
      restoredSource &&
      !remainingDestination &&
      (await fileContentsMatch(restoredSource, entry.file))
    ) {
      return { status: 'restored' };
    }

    return uncertainCompensation(
      `Rename rollback could not verify ${entry.oldWsPath}`,
    );
  }

  private handleCompensatedFileBatchOutcome(
    outcome: CompensatedFileBatchOutcome,
    operation: 'delete' | 'rename',
    wsName: string | undefined,
  ): void {
    switch (outcome.status) {
      case 'applied':
        return;
      case 'rolled-back':
        // The exact provider rejection is part of the method's established
        // interface when storage was fully restored.
        throw outcome.primaryError;
      case 'residual-uncertainty': {
        const error = createCompensatedFileBatchError(
          outcome,
          operation,
          wsName,
        );
        this.config.emitter.emit('event::file:force-update', {
          ...(wsName ? { wsName } : {}),
          sender: getEventSenderMetadata({ tag: this.name }),
        });
        throw error;
      }
      default: {
        const _exhaustiveCheck: never = outcome;
        throw new Error('Unexpected compensated file batch outcome', {
          cause: _exhaustiveCheck,
        });
      }
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
