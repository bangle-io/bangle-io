import { HELP_FS_INDEX_WS_PATH } from '@bangle.io/constants';
import { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { BaseError, getLast } from '@bangle.io/utils';
import { fromFsPath, isValidFileWsPath, resolvePath } from '@bangle.io/ws-path';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import {
  GITHUB_FILE_NOT_FOUND_ERROR,
  GITHUB_NOT_SUPPORTED,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_TOKEN,
} from './errors';
import { LocalFileEntryManager, RemoteFileEntry } from './file-ops';
import { getAllFiles, getFileBlob } from './github-api-helpers';

interface WsMetadata {
  githubToken: string;
  owner: string;
  branch: string;
}

const allowedFile = (path: string) => {
  if (path.includes(':')) {
    return false;
  }
  if (path.includes('//')) {
    return false;
  }
  const fileName = getLast(path.split('/'));
  if (fileName === undefined) {
    return false;
  }

  if (fileName.startsWith('.')) {
    return false;
  }

  return true;
};

export class GithubStorageProvider implements BaseStorageProvider {
  name = GITHUB_STORAGE_PROVIDER_NAME;
  displayName = 'Github storage';
  description = '';
  hidden = true;

  ghFileBlobsMap: Map<string, string> | undefined;
  fileEntryManager = new LocalFileEntryManager();

  private makeGetRemoteFileEntryCb(wsPath: string, opts: StorageOpts) {
    return async () => {
      const { wsName, fileName } = resolvePath(wsPath);

      if (!this.ghFileBlobsMap) {
        await this.listAllFiles(new AbortController().signal, wsName, opts);
      }

      const path = this.ghFileBlobsMap?.get(wsPath);

      if (!path) {
        return undefined;
      }
      const wsMetadata = opts.readWorkspaceMetadata() as WsMetadata;

      const file = await getFileBlob({
        fileBlobUrl: path,
        fileName,
        config: {
          branch: wsMetadata.branch,
          owner: wsMetadata.owner,
          githubToken: wsMetadata.githubToken,
          repoName: wsName,
        },
      });

      return RemoteFileEntry.newFile({
        wsPath,
        file,
      });
    };
  }

  async newWorkspaceMetadata(wsName: string, createOpts: any) {
    if (!createOpts.githubToken) {
      throw new BaseError({
        message: 'Github token is required',
        code: INVALID_GITHUB_TOKEN,
      });
    }
    if (!createOpts.owner) {
      throw new BaseError({
        message: 'Github owner is required',
        code: INVALID_GITHUB_TOKEN,
      });
    }
    return {
      githubToken: createOpts.githubToken,
      owner: createOpts.owner,
      branch: createOpts.branch,
    };
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return true;
    }

    return Boolean(await this.readFile(wsPath, opts));
  }

  async createFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    await this.fileEntryManager.createFile(
      wsPath,
      file,
      this.makeGetRemoteFileEntryCb(wsPath, opts),
    );
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    throw new BaseError({
      message: 'fileStat is not supported',
      code: GITHUB_NOT_SUPPORTED,
    });
    return {} as any;
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    await this.fileEntryManager.deleteFile(
      wsPath,
      this.makeGetRemoteFileEntryCb(wsPath, opts),
    );
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File> {
    (globalThis as any).gstorage = this;

    const file = await this.fileEntryManager.readFile(
      wsPath,
      this.makeGetRemoteFileEntryCb(wsPath, opts),
    );

    if (!file) {
      throw new BaseError({
        code: GITHUB_FILE_NOT_FOUND_ERROR,
        message: `File ${wsPath} not found`,
      });
    }

    return file;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    const wsMetadata = opts.readWorkspaceMetadata() as WsMetadata;
    const data = await getAllFiles({
      abortSignal,
      config: {
        branch: wsMetadata.branch,
        owner: wsMetadata.owner,
        githubToken: wsMetadata.githubToken,
        repoName: wsName,
      },
      treeSha: wsMetadata.branch,
    });

    this.ghFileBlobsMap?.clear();
    this.ghFileBlobsMap = new Map();

    return data
      .map((item): string | undefined => {
        const path = item.path;
        if (!allowedFile(path)) {
          return undefined;
        }

        const wsPath = fromFsPath(wsName + '/' + item.path);

        if (!wsPath) {
          throw new BaseError({
            message: `Your repository contains a file name "${item.path}" which is not supported`,
            code: INVALID_GITHUB_FILE_FORMAT,
          });
        }
        if (!isValidFileWsPath(wsPath)) {
          return undefined;
        }

        this.ghFileBlobsMap?.set(wsPath, item.url);
        return wsPath;
      })
      .filter(
        (wsPath: string | undefined): wsPath is string =>
          typeof wsPath === 'string',
      );
  }

  async writeFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    await this.fileEntryManager.writeFile(wsPath, file);

    // const writer = this.manager.getWriter(wsName);
    // writer.addFile(wsPath, file);
    // console.log(
    //   'saving file',
    //   wsPath,
    //   (await this.idbProvider.fileToDoc(file, opts)).toString(),
    // );

    // if (await this.fileExists(wsPath, opts)) {
    //   const oldSha = await getFileSha(await this.getFile(wsPath, opts));
    //   const newSha = await getFileSha(file);

    //   if (oldSha === newSha) {
    //     console.warn('same data ' + wsPath);
    //     return;
    //   }
    // }

    // const updatedShas = await writer.commit(wsName, {
    //   repoName: wsName,
    //   branch: githubConfig.branch,
    //   githubToken: githubConfig.githubToken,
    //   owner: githubConfig.owner,
    // });

    // updatedShas.forEach(async ([filePath, apiUrl]) => {
    //   const wsPath = fromFsPath(wsName + '/' + filePath)!;
    //   this.fileBlobs?.set(wsPath, apiUrl);
    // });
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    const file = await this.readFile(wsPath, opts);

    await this.writeFile(newWsPath, file, opts);
    await this.deleteFile(wsPath, opts);
  }
}
