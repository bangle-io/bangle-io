import { BaseFileSystemError } from './base-fs';
import {
  FILE_NOT_FOUND_ERROR,
  NOT_ALLOWED_ERROR,
  UPSTREAM_ERROR,
} from './error-codes';
import { IndexedDBFileSystem, IndexedDBFileSystemError } from './indexed-db-fs';

export class HelpFileSystem extends IndexedDBFileSystem {
  constructor(opts) {
    super(opts);
    this._token = opts.githubToken;
    this._owner = opts.githubOwner;
    this._repo = opts.githubRepo;
    this._branch = opts.githubBranch || 'master';
    this._allowedFile = opts.allowedFile || ((filePath) => true);
  }

  _fetch(filePath) {
    const [name, ...path] = filePath.split('/');
    const url = `https://raw.githubusercontent.com/${this._owner}/${
      this._repo
    }/${this._branch}/${path.join('/')}`;
    return fetch(url).then(
      (r) => {
        if (r.ok) {
          return r;
        }
        if (r.status === 404) {
          return Promise.reject(
            new HelpFileSystemError(
              `File ${filePath} not found`,
              FILE_NOT_FOUND_ERROR,
              `File ${filePath} not found`,
            ),
          );
        }
        return Promise.reject(
          new HelpFileSystemError(
            'Encountered an error making request to github',
            UPSTREAM_ERROR,
            null,
            new Error(`Request with "${url}" failed with code=${r.status}`),
          ),
        );
      },
      (error) => {
        throw new HelpFileSystemError(
          'Encountered an error with github',
          UPSTREAM_ERROR,
          null,
          error,
        );
      },
    );
  }

  async readFileAsText(filePath) {
    let result;
    result = await super.readFileAsText(filePath).catch((error) => {
      if (
        error instanceof BaseFileSystemError &&
        error.code === FILE_NOT_FOUND_ERROR
      ) {
        return;
      } else {
        throw error;
      }
    });

    if (!result) {
      result = await this._fetch(filePath).then((r) => r.text());
    }

    return result;
  }

  async readFile(filePath) {
    let result;
    console.log('here', filePath);

    result = await super.readFile(filePath).catch((error) => {
      if (
        error instanceof BaseFileSystemError &&
        error.code === FILE_NOT_FOUND_ERROR
      ) {
        return;
      } else {
        throw error;
      }
    });

    if (!result) {
      result = await this._fetch(filePath).then((r) => r.blob());
    }

    return result;
  }

  async rename(oldFilePath, newFilePath) {
    throw new HelpFileSystemError(
      `Rename not allowed`,
      // TODO handle this error
      NOT_ALLOWED_ERROR,
      `Help files cannot be renamed`,
    );
  }

  async opendirRecursive(dirPath) {
    // this is the wsName and all paths are returned
    // starting with their wsName
    const [prefix] = dirPath.split('/');
    const localFiles = await super.opendirRecursive(dirPath);
    let remoteData = await this._fetch(prefix + '/.bangle/files.json')
      .then((r) => r.json())
      .catch((error) => {
        if (
          error instanceof BaseFileSystemError &&
          error.code === FILE_NOT_FOUND_ERROR
        ) {
          return;
        } else {
          throw error;
        }
      });

    if (!remoteData) {
      remoteData = await apiGetFiles({
        token: this._token,
        owner: this._owner,
        repo: this._repo,
        branch: this._branch,
      });
      this._apiData = remoteData;
    }

    remoteData = remoteData.map((r) => prefix + '/' + r);

    const result = Array.from(
      new Set([...remoteData, ...localFiles]),
    ).filter((filePath) => this._allowedFile(filePath));

    return result;
  }
}

export class HelpFileSystemError extends IndexedDBFileSystemError {}

async function apiGetFiles({ token, owner, repo, branch }) {
  const data = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=true`,
    {
      headers: {
        accept: 'application/vnd.github.v3+json',
        authorization: token ? `token ${token}` : undefined,
      },
      method: 'GET',
    },
  ).then((r) => {
    if (r.ok) {
      return r.json();
    }
    if (r.status === 403) {
      throw new HelpFileSystemError(
        'Github API rate limited',
        UPSTREAM_ERROR,
        'Github requests are being rate limited, please use a personal access token to avoid this',
        new Error('Github API rate limited'),
      );
    }

    throw new HelpFileSystemError(
      'Github API error',
      UPSTREAM_ERROR,
      null,
      new Error(`Github API error ${r.status} ${r.statusText}`),
    );
  });

  if (data.truncated) {
    throw new HelpFileSystemError(
      'Github API response was truncated',
      UPSTREAM_ERROR,
      null,
      new Error(`Github truncated response`),
    );
  }

  return data.tree.map((item) => item.path);
}
