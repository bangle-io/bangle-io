import type { Node } from '@bangle.dev/pm';

import { HELP_FS_INDEX_WS_PATH } from '@bangle.io/constants';
import {
  BaseStorageProvider,
  IndexedDbStorageProvider,
  StorageOpts,
} from '@bangle.io/storage';
import { BaseError, getLast } from '@bangle.io/utils';
import { fromFsPath, resolvePath } from '@bangle.io/ws-path';

import { GITHUB_STORAGE_PROVIDER_NAME } from './common';
import {
  GITHUB_API_ERROR,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_RESPONSE,
  INVALID_GITHUB_TOKEN,
} from './errors';

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
  displayName = 'Help documentation';
  description = '';
  hidden = true;

  fileBlobs: Map<string, string> | undefined;

  private idbProvider = new IndexedDbStorageProvider();

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
      owner: createOpts.owner || 'kepta',
      branch: createOpts.branch || 'master',
    };
  }

  async fileExists(wsPath: string, opts: StorageOpts): Promise<boolean> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return true;
    }

    if (await this.getFile(wsPath, opts)) {
      return true;
    }

    return this.idbProvider.fileExists(wsPath, opts);
  }

  async fileStat(wsPath: string, opts: StorageOpts) {
    return this.idbProvider.fileStat(wsPath, opts);
  }

  async deleteFile(wsPath: string, opts: StorageOpts): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }

    await this.idbProvider.deleteFile(wsPath, opts);
  }

  async getDoc(wsPath: string, opts: StorageOpts) {
    const file = await this.getFile(wsPath, opts);

    if (file) {
      return this.idbProvider.fileToDoc(file, opts);
    }

    throw new Error('File not found');
  }

  async getFile(wsPath: string, opts: StorageOpts): Promise<File> {
    const r = opts.readWorkspaceMetadata() as WsMetadata;
    const { wsName, fileName } = resolvePath(wsPath);
    if (!this.fileBlobs) {
      await this.listAllFiles(new AbortController().signal, wsName, opts);
    }

    const file = await fetch(this.fileBlobs?.get(wsPath) || '', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3.raw+json',
        Authorization: `token ${r.githubToken}`,
      },
    })
      .then((r) => r.blob())
      .then((r) => {
        return new File([r], fileName);
      });

    return file;
  }

  async listAllFiles(
    abortSignal: AbortSignal,
    wsName: string,
    opts: StorageOpts,
  ): Promise<string[]> {
    const r = opts.readWorkspaceMetadata() as WsMetadata;

    return fetch(
      `https://api.github.com/repos/${r.owner}/${wsName}/git/trees/${r.branch}?recursive=1`,
      {
        method: 'GET',
        signal: abortSignal,
        headers: {
          Authorization: `token ${r.githubToken}`,
        },
      },
    )
      .then((res) => {
        if (!res.ok) {
          return res.json().then((r) => {
            throw new BaseError({ message: r.message, code: GITHUB_API_ERROR });
          });
        }
        return res.json();
      })
      .then(async (res) => {
        if (res.truncated) {
          throw new BaseError({
            message: 'Github response is truncated',
            code: INVALID_GITHUB_RESPONSE,
          });
        }
        if (res.tree) {
          this.fileBlobs?.clear();
          this.fileBlobs = new Map();

          return res.tree
            .map((e: any): string | undefined => {
              const path = e.path;
              if (!allowedFile(path)) {
                return undefined;
              }

              const wsPath = fromFsPath(wsName + '/' + e.path);
              if (!wsPath) {
                throw new BaseError({
                  message: `Your repository contains a file name "${e.path}" which is not supported`,
                  code: INVALID_GITHUB_FILE_FORMAT,
                });
              }
              this.fileBlobs?.set(wsPath, e.url);
              return wsPath;
            })
            .filter((wsPath: string | undefined) => Boolean(wsPath));
        }

        throw new BaseError({
          message: res.message,
          code: INVALID_GITHUB_RESPONSE,
        });
      })

      .catch((e) => {
        if (e.name === 'AbortError') {
          return [];
        }
        throw e;
      });
  }

  async saveDoc(wsPath: string, doc: Node, opts: StorageOpts): Promise<void> {
    const { fileName } = resolvePath(wsPath);

    // const metadata = opts.readWorkspaceMetadata() as WsMetadata;

    // const file = await this.idbProvider.docToFile(doc, fileName, opts);

    // const text = await file.text();
  }

  async saveFile(wsPath: string, file: File, opts: StorageOpts): Promise<void> {
    return this.idbProvider.saveFile(wsPath, file, opts);
  }

  async renameFile(
    wsPath: string,
    newWsPath: string,
    opts: StorageOpts,
  ): Promise<void> {
    if (wsPath === HELP_FS_INDEX_WS_PATH) {
      return;
    }
    await this.idbProvider.renameFile(wsPath, newWsPath, opts);
  }
}
