import * as idb from 'idb-keyval';

import {
  LocalFileEntryManager,
  RemoteFileEntry,
} from '@bangle.io/remote-file-sync';
import { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { BaseError, getLast } from '@bangle.io/utils';
import { fromFsPath, isValidFileWsPath, resolvePath } from '@bangle.io/ws-path';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import {
  GITHUB_STORAGE_NOT_ALLOWED,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_TOKEN,
} from './errors';
import { getAllFiles, readGhFile } from './github-api-helpers';
import { WsMetadata } from './helpers';

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
  fileEntryManager = new LocalFileEntryManager({
    get: (key: string) => {
      return idb.get(`gh-store-1:${key}`);
    },
    set: (key, entry) => {
      return idb.set(`gh-store-1:${key}`, entry);
    },
    entries: () => {
      return idb.entries().then((entries) => {
        return entries
          .filter(([key]) => {
            if (typeof key === 'string') {
              return key.startsWith('gh-store-1:');
            }
            return false;
          })
          .map(([key, value]) => [key, value] as [string, any]);
      });
    },
    delete: (key) => {
      return idb.del(`gh-store-1:${key}`);
    },
  });

  public makeGetRemoteFileEntryCb(wsPath: string, opts: StorageOpts) {
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

      const file = await readGhFile({
        wsPath,
        config: {
          branch: wsMetadata.branch,
          owner: wsMetadata.owner,
          githubToken: wsMetadata.githubToken,
          repoName: wsName,
        },
      });
      console.log({ file });
      // const file = await getFileBlob({
      //   fileBlobUrl: path,
      //   fileName,
      //   config: {
      //     branch: wsMetadata.branch,
      //     owner: wsMetadata.owner,
      //     githubToken: wsMetadata.githubToken,
      //     repoName: wsName,
      //   },
      // });

      return RemoteFileEntry.newFile({
        uid: wsPath,
        file,
        deleted: undefined,
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
      code: GITHUB_STORAGE_NOT_ALLOWED,
    });
    return {} as any;
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    await this.fileEntryManager.deleteFile(
      wsPath,
      this.makeGetRemoteFileEntryCb(wsPath, opts),
    );
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File | undefined> {
    const file = await this.fileEntryManager.readFile(
      wsPath,
      this.makeGetRemoteFileEntryCb(wsPath, opts),
    );

    if (!file) {
      return undefined;
    }

    return file;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    const getRemoteFiles = async () => {
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
    };

    const files = await this.fileEntryManager.listFiles(getRemoteFiles);
    return files;
  }

  async writeFile(
    wsPath: string,
    file: File,
    opts: StorageOpts,
  ): Promise<void> {
    await this.fileEntryManager.writeFile(wsPath, file);
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    const file = await this.readFile(wsPath, opts);
    if (!file) {
      throw new BaseError({
        message: 'Cannot rename as file not found',
        code: GITHUB_STORAGE_NOT_ALLOWED,
      });
    }

    await this.createFile(newWsPath, file, opts);
    await this.deleteFile(wsPath, opts);
  }
}
