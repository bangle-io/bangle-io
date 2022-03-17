import { RemoteFileEntry } from '@bangle.io/remote-file-sync';
import { BaseStorageProvider, StorageOpts } from '@bangle.io/storage';
import { BaseError } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import { GITHUB_STORAGE_NOT_ALLOWED, INVALID_GITHUB_TOKEN } from './errors';
import { localFileEntryManager } from './file-entry-manager';
import { GithubRepoTree } from './github-repo-tree';
import { GithubWsMetadata } from './helpers';

export class GithubStorageProvider implements BaseStorageProvider {
  name = GITHUB_STORAGE_PROVIDER_NAME;
  displayName = 'Github storage';
  description = '';
  hidden = true;

  private fileEntryManager = localFileEntryManager;

  private makeGetRemoteFileEntryCb(
    wsMetadata: GithubWsMetadata,
    useCache: boolean,
    abortSignal: AbortSignal = new AbortController().signal,
  ) {
    return async (wsPath: string) => {
      const file = await GithubRepoTree.getFileBlob(
        wsPath,
        wsMetadata,
        abortSignal,
      );

      if (!file) {
        return undefined;
      }

      return RemoteFileEntry.newFile({
        uid: wsPath,
        file: file,
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
      this.makeGetRemoteFileEntryCb(
        opts.readWorkspaceMetadata() as GithubWsMetadata,
        false,
      ),
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
      this.makeGetRemoteFileEntryCb(
        opts.readWorkspaceMetadata() as GithubWsMetadata,
        false,
      ),
    );
  }

  async readFile(wsPath: string, opts: StorageOpts): Promise<File | undefined> {
    const file = await this.fileEntryManager.readFile(
      wsPath,
      this.makeGetRemoteFileEntryCb(
        opts.readWorkspaceMetadata() as GithubWsMetadata,
        false,
      ),
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
    const wsMetadata = opts.readWorkspaceMetadata() as GithubWsMetadata;
    await GithubRepoTree.refreshCachedData(wsName, wsMetadata, abortSignal);

    const files = await this.fileEntryManager.listFiles(
      await GithubRepoTree.getWsPaths(wsName, wsMetadata, abortSignal),
      wsName + ':',
    );
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
