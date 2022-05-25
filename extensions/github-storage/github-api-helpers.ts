import { wsPathHelpers } from '@bangle.io/api';
import { BaseError, getLast } from '@bangle.io/utils';

import { GITHUB_API_ERROR, INVALID_GITHUB_RESPONSE } from './errors';

export interface GithubTokenConfig {
  githubToken: string;
}

export interface GithubConfig extends GithubTokenConfig {
  owner: string;
  branch: string;
  repoName: string;
}

// Only one of them is required
export const ALLOWED_GH_SCOPES = ['repo', 'public_repo'];

const allowedFilePath = (path: string) => {
  if (path.includes(':')) {
    return false;
  }
  if (path.includes('//')) {
    return false;
  }
  if (path.length > 150) {
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

const RATELIMIT_STRING = `
rateLimit {
  limit
  cost
  remaining
  resetAt
}`;

async function makeV3GetApi({
  path,
  token,
  abortSignal,
  headers,
  isBlob,
}: {
  isBlob?: boolean;
  path: string;
  abortSignal?: AbortSignal;
  token: string;
  headers?: { [r: string]: string };
}): Promise<{ data: any; headers: Response['headers'] }> {
  const url = path.includes('https://')
    ? path
    : `https://api.github.com${path}`;

  const res = await fetch(url, {
    method: 'GET',
    signal: abortSignal,
    headers: {
      Authorization: `token ${token}`,
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    return res.json().then((r) => {
      throw new BaseError({ message: r.message, code: GITHUB_API_ERROR });
    });
  }

  console.debug(
    'Github API limit left',
    res.headers.get('X-RateLimit-Remaining'),
  );

  const data = isBlob ? res.blob() : res.json();

  return {
    data: await data,
    headers: res.headers,
  };
}

async function makeGraphql({
  query,
  variables,
  token,
}: {
  query: string;
  variables: { [r: string]: any };
  token: string;
}): Promise<any> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${token}`,
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new BaseError({
      // json.message contains the Bad credentials error which is needed to ask for new tokens
      message: json.message || 'Github responded with an invalid status code',
      code: GITHUB_API_ERROR,
    });
  }

  if (json.errors && json.errors.length > 0) {
    console.log('Github Graphql API error', json.errors[0]);
    throw new BaseError({
      message: json.errors[0].message,
      code: GITHUB_API_ERROR,
    });
  }

  console.debug(
    'Github graphql API limit left',
    res.headers.get('X-RateLimit-Remaining'),
  );

  return json.data;
}

export type RepositoryInfo = {
  name: string;
  owner: string;
  branch: string;
  description: string;
};

export async function getBranchHead({
  config,
  abortSignal,
}: {
  config: GithubConfig;
  abortSignal?: AbortSignal;
}) {
  const query = `query ($repoName: String!, $branchName: String!, $owner: String!) {
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
    repository(name: $repoName, owner: $owner) {
      description
      ref(qualifiedName: $branchName) {
        name
        prefix
        target {
          oid
        }
      }
    }
  }`;

  const result = await makeGraphql({
    query,
    variables: {
      repoName: config.repoName,
      branchName: config.branch,
      owner: config.owner,
    },
    token: config.githubToken,
  });

  const oid = result?.repository?.ref?.target?.oid;

  if (typeof oid === 'string') {
    return oid;
  }
  throw new BaseError({
    message: `Could not get branch head of ${config.repoName}.`,
    code: INVALID_GITHUB_RESPONSE,
  });
}

export async function hasValidGithubScope({
  abortSignal,
  token,
}: {
  token: GithubTokenConfig['githubToken'];
  abortSignal?: AbortSignal;
}) {
  let scopeStr = (await getScopes({ token, abortSignal })) || '';
  let scopes = scopeStr.split(',').map((s) => s.trim());

  return ALLOWED_GH_SCOPES.some((s) => scopes.includes(s));
}

export async function getScopes({
  abortSignal,
  token,
}: {
  token: GithubTokenConfig['githubToken'];
  abortSignal?: AbortSignal;
}) {
  const { headers } = await makeV3GetApi({
    path: '',
    token: token,
    abortSignal,
  });

  return headers.get('X-OAuth-Scopes');
}
export async function* getRepos({
  token,
}: {
  token: GithubTokenConfig['githubToken'];
}): AsyncIterable<RepositoryInfo[]> {
  const query = `
    query ($after: String) {
      ${RATELIMIT_STRING}
      viewer {
        repositories(first: 50, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }
          edges {
            node {
              name
              defaultBranchRef {
                name
                target {
                  oid
                }
              }
              nameWithOwner
              description
            }
          }
        }
      }
    }`;
  let hasNextPage;

  let endCursor = undefined;
  let calls = 0;
  let result: RepositoryInfo[] = [];
  do {
    let data: any = await makeGraphql({
      query,
      variables: { after: endCursor },
      token,
    });

    if (calls++ > 20) {
      break;
    }

    if (!Array.isArray(data.viewer.repositories?.edges)) {
      yield result;
      break;
    }

    ({ hasNextPage, endCursor } = data.viewer.repositories.pageInfo);

    result = result.concat(
      data.viewer.repositories.edges
        .map((r: any): RepositoryInfo => {
          return {
            name: r.node?.name,
            owner: r.node?.nameWithOwner?.split('/')[0],
            branch: r.node?.defaultBranchRef?.name,
            description: r.node?.description || '',
          };
        })
        .filter((r: RepositoryInfo) => {
          return r.name && r.owner && r.branch;
        }),
    );
    yield result;
  } while (hasNextPage);
}

export async function getTree({
  abortSignal,
  wsName,
  config,
}: {
  abortSignal: AbortSignal;
  wsName: string;
  config: GithubConfig;
}): Promise<{ sha: string; tree: Array<{ url: string; wsPath: string }> }> {
  const makeRequest = async (
    attempt = 0,
    lastErrorMessage?: string,
  ): Promise<{
    truncated: boolean;
    tree: Array<{ url: string; wsPath: string }>;
    sha: string;
  }> => {
    if (attempt > 3) {
      throw new BaseError({
        message: lastErrorMessage || `Could not get tree for ${wsName}`,
        code: INVALID_GITHUB_RESPONSE,
      });
    }

    try {
      return (
        await makeV3GetApi({
          path: `/repos/${config.owner}/${config.repoName}/git/trees/${
            config.branch
          }?recursive=1&cacheBust=${Math.floor(Date.now() / 1000)}`,
          token: config.githubToken,
          abortSignal,
        })
      ).data;
    } catch (error) {
      if (error instanceof Error || error instanceof BaseError) {
        if (error.message.includes('Git Repository is empty.')) {
          let errorMessage = error.message;

          return initializeRepo({ config }).then((sha) => {
            return makeRequest(attempt + 1, errorMessage);
          });
        }
        // this is thrown when repo is initialized but has no files
        if (error.message === 'Not Found') {
          return getLatestCommitSha({ config, abortSignal }).then((sha) => ({
            truncated: false,
            tree: [],
            sha: sha,
          }));
        }
      }
      throw error;
    }
  };
  const { truncated, tree, sha } = await makeRequest(0);

  if (truncated || !tree) {
    throw new BaseError({
      message: 'Github response is truncated',
      code: INVALID_GITHUB_RESPONSE,
    });
  }

  const list = (tree as any[])
    .filter((t) => {
      return allowedFilePath(t.path);
    })
    .map((t: any) => {
      const wsPath = wsPathHelpers.fromFsPath(wsName + '/' + t.path);

      if (!wsPath) {
        throw new BaseError({
          message: 'File path contains invalid characters :' + t.path,
          code: INVALID_GITHUB_RESPONSE,
        });
      }

      return {
        url: t.url,
        wsPath,
      };
    });

  return {
    sha,
    tree: list,
  };
}

export async function pushChanges({
  headSha,
  commitMessage,
  additions,
  deletions,
  config,
  abortSignal,
}: {
  abortSignal: AbortSignal;
  headSha: string;
  commitMessage: {
    headline: string;
    body?: string;
  };
  additions: Array<{ path: string; base64Content: string }>;
  deletions: Array<{ path: string }>;
  config: GithubConfig;
}): Promise<Array<[string, string]>> {
  let query = `
    mutation ($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          url
          oid
        }
      }
    }
  `;
  const result = await makeGraphql({
    query,
    variables: {
      input: {
        expectedHeadOid: headSha,
        branch: {
          branchName: config.branch,
          repositoryNameWithOwner: `${config.owner}/${config.repoName}`,
        },
        message: commitMessage,
        fileChanges: {
          additions: additions.map((r) => ({
            path: r.path,
            contents: r.base64Content,
          })),
          deletions: deletions,
        },
      },
    },
    token: config.githubToken,
  });

  const commitHash = result.createCommitOnBranch?.commit?.oid;

  const { data: result2 } = await makeV3GetApi({
    path: `/repos/${config.owner}/${config.repoName}/commits/${commitHash}`,
    token: config.githubToken,
    abortSignal,
  });

  return result2.files.map((r: any) => {
    const blobUrl = r.blob_url.split('/');
    const blob = blobUrl[blobUrl.indexOf('blob') + 1];

    if (typeof blob !== 'string' || blob.length !== 40) {
      throw new BaseError({
        message: 'Invalid github blob returned',
        code: INVALID_GITHUB_RESPONSE,
      });
    }
  });
}

export async function getFileBlob({
  fileBlobUrl,
  config,
  fileName,
  abortSignal,
}: {
  fileName: string;
  fileBlobUrl: string;
  config: GithubConfig;
  abortSignal: AbortSignal;
}) {
  return makeV3GetApi({
    isBlob: true,
    path: fileBlobUrl,
    token: config.githubToken,
    abortSignal,
    headers: {
      Accept: 'application/vnd.github.v3.raw+json',
    },
  }).then((r) => {
    return new File([r.data], fileName);
  });
}

export async function getLatestCommitSha({
  config,
  abortSignal,
}: {
  config: GithubConfig;
  abortSignal: AbortSignal;
}) {
  let path = `/repos/${config.owner}/${config.repoName}/commits/${
    config.branch
  }?cacheBust=${Math.floor(Date.now() / 1000)}`;

  const makeRequest = async () => {
    return (
      await makeV3GetApi({
        path,
        token: config.githubToken,
        abortSignal,
        headers: {
          Accept: 'application/vnd.github.v3.raw+json',
        },
      })
    ).data;
  };

  return makeRequest().then(
    (r) => {
      return r.sha;
    },
    (error) => {
      if (error.message.includes('Git Repository is empty.')) {
        return initializeRepo({ config }).then((sha) => {
          return makeRequest();
        });
      }
      throw error;
    },
  );
}

export async function initializeRepo({
  config,
}: {
  config: GithubConfig;
}): Promise<void> {
  const fileContent = `## Welcome to Bangle.io\n This is a sample note to get things started.`;
  const filePath = 'welcome-to-bangle.md';
  const res = await fetch(
    `https://api.github.com/repos/${config.owner}/${config.repoName}/contents/` +
      filePath,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${config.githubToken}`,
        Accept: 'application/vnd.github.v3.raw+json',
      },
      body: JSON.stringify({
        message: 'Bangle.io first commit',
        content: btoa(fileContent),
        branch: config.branch,
      }),
    },
  );

  if (!res.ok) {
    const message = await res.json().then((data) => {
      return data.message;
    });

    if (
      // if the file already exists
      message === 'reference already exists' ||
      // if a file already exists github expects you to provide a sha
      message.includes(`"sha" wasn't supplied`) ||
      // this is thrown when repo is initialized but has no files
      message === 'Not Found'
    ) {
      return;
    }

    throw new BaseError({
      message: message,
      code: GITHUB_API_ERROR,
    });
  }
}

export async function createRepo({
  config,
  description = 'Created automatically by Bangle.io',
}: {
  config: GithubConfig;
  description?: string;
}): Promise<void> {
  const res = await fetch(`https://api.github.com/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `token ${config.githubToken}`,
      Accept: 'application/vnd.github.v3.raw+json',
    },
    body: JSON.stringify({
      name: config.repoName,
      private: true,
      homepage: `https://${config.owner}.github.io/${config.repoName}/`,
      description: description,
    }),
  });

  if (!res.ok) {
    throw new BaseError({
      message: await res
        .json()
        .then((data) => data.message || data.errors?.[0]?.message),
      code: GITHUB_API_ERROR,
    });
  }
}
