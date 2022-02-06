import { BaseError } from '@bangle.io/utils';

import { GITHUB_API_ERROR } from './errors';

export interface GithubTokenConfig {
  githubToken: string;
}

export interface GithubConfig extends GithubTokenConfig {
  owner: string;
  branch: string;
}
const RATELIMIT_STRING = `
rateLimit {
  limit
  cost
  remaining
  resetAt
}`;

function makeGraphql(
  query: string,
  variables: { [r: string]: any },
  config: GithubTokenConfig,
): Promise<any> {
  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${config.githubToken}`,
    },
    body: JSON.stringify({
      query: query,
      variables: variables,
    }),
  })
    .then((r) => {
      if (r.ok) {
        return r.json();
      }
      throw new BaseError({
        message: 'Github responded with an invalid status code',
        code: GITHUB_API_ERROR,
      });
    })
    .then((r) => {
      if (r.errors && r.errors.length > 0) {
        console.log('Github Graphql API error', r.errors[0]);
        throw new BaseError({
          message: r.errors[0].message,
          code: GITHUB_API_ERROR,
        });
      }
      return r.data;
    });
}

export type RepositoryInfo = {
  name: string;
  owner: string;
  branch: string;
  description: string;
};
export async function* getRepos(
  config: GithubTokenConfig,
): AsyncIterable<RepositoryInfo[]> {
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
    let data: any = await makeGraphql(query, { after: endCursor }, config);
    if (calls++ > 20) {
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
