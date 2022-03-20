import base64 from 'base64-js';

import { BaseError } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

import { GITHUB_STORAGE_NOT_ALLOWED } from './errors';
import { getBranchHead, GithubConfig, pushChanges } from './github-api-helpers';

const fileToBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();

  return base64.fromByteArray(new Uint8Array(buffer));
};

export class GithubWorkspaceManager {
  spec: {
    [wsName: string]: {
      writer: GithubWriter;
    };
  } = {};

  private getMatch(wsName: string) {
    let match = this.spec[wsName];

    if (!match) {
      match = {
        writer: new GithubWriter({}, new Set()),
      };
      this.spec[wsName] = match;
    }

    return match;
  }

  public getWriter(wsName: string) {
    return this.getMatch(wsName).writer;
  }
}

export class GithubWriter {
  fileBlobCache: Map<string, string> = new Map();

  constructor(
    private additions: { [wsPath: string]: File },
    private deletions: Set<string>,
  ) {}

  updateFileCache(cache: GithubWriter['fileBlobCache']) {
    this.fileBlobCache = cache;
  }

  async getFile(wsPath: string): Promise<File | undefined> {
    if (this.deletions.has(wsPath)) {
      throw new BaseError({
        message: 'File not found',
        code: GITHUB_STORAGE_NOT_ALLOWED,
      });
    }
    console.log(Object.keys(this.additions), wsPath);

    return this.additions[wsPath];
  }

  addFile(wsPath: string, file: File): void {
    let _wsName = resolvePath(wsPath).wsName;
    Object.keys(this.additions).forEach((wsPath) => {
      const { wsName } = resolvePath(wsPath);
      if (_wsName !== wsName) {
        throw new Error('Workspace name mismatch');
      }
    });
    this.additions[wsPath] = file;
  }

  deleteFile(wsPath: string): void {
    let _wsName = resolvePath(wsPath).wsName;
    this.deletions.forEach((wsPath) => {
      const { wsName } = resolvePath(wsPath);
      if (_wsName !== wsName) {
        throw new Error('Workspace name mismatch');
      }
    });
    this.deletions.add(wsPath);
  }

  async commit(
    _wsName: string,
    config: GithubConfig,
    abortSignal: AbortSignal,
  ) {
    const additions = Object.entries(this.additions);
    const deletions = [...this.deletions];

    const commitBody = `
Files:
- Added ${additions.map((r) => r[0]).join(', ')}
${deletions.length > 0 ? `- Deleted ${deletions.join(', ')}` : ''}`.trim();

    if (deletions.length === 0 && Object.keys(additions).length === 0) {
      return [];
    }

    const updatedShas = await pushChanges({
      abortSignal,
      headSha: await getBranchHead({
        config: config,
      }),
      commitMessage: {
        headline: 'Bangle.io: update ' + config.repoName,
        body: commitBody,
      },
      additions: await Promise.all(
        additions.map(async ([wsPath, file]) => {
          return {
            base64Content: await fileToBase64(file),
            path: resolvePath(wsPath).filePath,
          };
        }),
      ),
      deletions: [...this.deletions].map((wsPath) => {
        const { filePath, wsName } = resolvePath(wsPath);
        if (_wsName !== wsName) {
          throw new Error('Workspace name mismatch');
        }

        return { path: filePath };
      }),
      config: config,
    });

    additions.forEach(([wsPath, file]) => {
      if (file === this.additions[wsPath]) {
        delete this.additions[wsPath];
      }
    });
    deletions.forEach((del) => {
      this.deletions.delete(del);
    });

    return updatedShas;
  }
}

export async function commitToGithub(
  additions: [string, File][],
  deletions: string[],
  _wsName: string,
  config: GithubConfig,
  abortSignal: AbortSignal,
) {
  const commitBody = `
Files Added:
- ${additions.map((r) => r[0]).join('\n- ')}

Files Deleted:
${deletions.length > 0 ? `- Deleted ${deletions.join('\n- ')}` : ''}`.trim();

  if (deletions.length === 0 && Object.keys(additions).length === 0) {
    return [];
  }

  const updatedShas = await pushChanges({
    abortSignal,
    headSha: await getBranchHead({
      config: config,
    }),
    commitMessage: {
      headline: 'Bangle.io: update ' + config.repoName,
      body: commitBody,
    },
    additions: await Promise.all(
      additions.map(async ([wsPath, file]) => {
        return {
          base64Content: await fileToBase64(file),
          path: resolvePath(wsPath).filePath,
        };
      }),
    ),
    deletions: deletions.map((wsPath) => {
      const { filePath, wsName } = resolvePath(wsPath);
      if (_wsName !== wsName) {
        throw new Error('Workspace name mismatch');
      }

      return { path: filePath };
    }),
    config: config,
  });

  return updatedShas;
}
