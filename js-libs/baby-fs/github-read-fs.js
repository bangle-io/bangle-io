import { BaseFileSystemError } from './base-fs';
import {
  FILE_NOT_FOUND_ERROR,
  NOT_ALLOWED_ERROR,
  UPSTREAM_ERROR,
} from './error-codes';
import { IndexedDBFileSystem, IndexedDBFileSystemError } from './indexed-db-fs';

/**
 * This is currently defunct:
 * TODO: The reading form rawgithub or gh-pages might violate the github service level agreement
 * if we directly fetch data from their raw url, though fetching
 * from API is fine, but subject to ratelimits. but if I let me users
 * read from raw github would it be okay?
 */
export class GithubReadFileSystem extends IndexedDBFileSystem {
  constructor(opts) {
    super(opts);
    this._token = opts.githubToken;
    this._owner = opts.githubOwner;
    this._repo = opts.githubRepo;
    this._branch = opts.githubBranch || 'master';
    this._allowedFile = opts.allowedFile || ((filePath) => true);
    this._fetch = fetchRawGithub({
      owner: this._owner,
      repo: this._repo,
      branch: this._branch,
    });
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
    throw new GithubReadFileSystem(
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
    let remoteData = await listOfFilesFromGithub({
      prefix,
      token: this._token,
      owner: this._owner,
      repo: this._repo,
      branch: this._branch,
    });

    remoteData = remoteData.map((r) => prefix + '/' + r);

    const result = Array.from(
      new Set([...remoteData, ...localFiles]),
    ).filter((filePath) => this._allowedFile(filePath));

    return result;
  }
}

export class GithubReadFileSystemError extends IndexedDBFileSystemError {}

function fetchRawGithub({ owner, repo, branch }) {
  return (filePath) => {
    const [name, ...path] = filePath.split('/');
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.join(
      '/',
    )}`;
    return fetch(url).then(
      (r) => {
        if (r.ok) {
          return r;
        }
        if (r.status === 404) {
          return Promise.reject(
            new GithubReadFileSystem(
              `File ${filePath} not found`,
              FILE_NOT_FOUND_ERROR,
              `File ${filePath} not found`,
            ),
          );
        }
        return Promise.reject(
          new GithubReadFileSystem(
            'Encountered an error making request to github',
            UPSTREAM_ERROR,
            null,
            new Error(`Request with "${url}" failed with code=${r.status}`),
          ),
        );
      },
      (error) => {
        throw new GithubReadFileSystem(
          'Encountered an error with github',
          UPSTREAM_ERROR,
          null,
          error,
        );
      },
    );
  };
}

export async function listOfFilesFromGithub({
  token,
  prefix,
  owner,
  branch,
  repo,
}) {
  let remoteData = await fetchRawGithub({ owner, branch, repo })(
    prefix + '/.bangle/files.json',
  )
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
      token: token,
      owner: owner,
      repo: repo,
      branch: branch,
    });
  }

  return remoteData;
}

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
      throw new GithubReadFileSystem(
        'Github API rate limited',
        UPSTREAM_ERROR,
        'Github requests are being rate limited, please use a personal access token to avoid this',
        new Error('Github API rate limited'),
      );
    }

    throw new GithubReadFileSystem(
      'Github API error',
      UPSTREAM_ERROR,
      null,
      new Error(`Github API error ${r.status} ${r.statusText}`),
    );
  });

  if (data.truncated) {
    throw new GithubReadFileSystem(
      'Github API response was truncated',
      UPSTREAM_ERROR,
      null,
      new Error(`Github truncated response`),
    );
  }

  return data.tree.map((item) => item.path);
}
