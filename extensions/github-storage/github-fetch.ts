export const githubGraphqlFetch = async ({
  token,
  query,
  variables,
  abortSignal,
}: {
  query: string;
  token: string;
  variables: { [r: string]: any };
  abortSignal?: AbortSignal;
}) => {
  return fetch('https://api.github.com/graphql', {
    signal: abortSignal,
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
};

export const githubRestFetch = async ({
  path,
  token,
  headers,
  abortSignal,
  method,
  body,
}: {
  method: string;
  token: string;
  path: string;
  headers?: { [r: string]: string };
  abortSignal?: AbortSignal;
  body?: string;
}) => {
  const url = path.includes('https://')
    ? path
    : `https://api.github.com${path}`;

  return fetch(url, {
    method,
    signal: abortSignal,
    headers: {
      Authorization: `token ${token}`,
      ...(headers || {}),
    },
    body,
  });
};
