import { Octokit } from '@octokit/rest';
import { createFile, deleteFile } from './file-helpers';
import { FileError } from './indexdb';
import { createWorkspace, deleteWorkspace } from './workspace-helpers';

export async function importGithubWorkspace(githubUrl, wsType, wsName, token) {
  const { repo, files } = await getGithubRepoContents(githubUrl, token);

  wsName = wsName || repo;

  await createWorkspace(wsName, wsType);
  try {
    await Promise.all(
      files.map(async (f) => {
        const wsPath = wsName + ':' + f.path;
        try {
          await createFile(wsPath, f.textContent, 'markdown');
        } catch (error) {
          if (
            error instanceof FileError &&
            error.message.includes('already exists')
          ) {
            await deleteFile(wsPath);
            await createFile(wsPath, f.textContent, 'markdown');
            // ignore file errors
          }
        }
      }),
    );
  } catch (error) {
    await deleteWorkspace(wsName);
    throw error;
  }

  return wsName;
}

/**
 * Returns an array of path names
 */
async function getGithubRepoContents(
  url,
  token = new URLSearchParams(window.location.search).get('github_token'),
) {
  let owner, repo;

  const octokit = new Octokit({
    auth: token,
  });

  if (url.startsWith('https://github.com/')) {
    url = url.split('https://github.com/').join('');
  } else if (url.startsWith('http://github.com/')) {
    url = url.split('http://github.com/').join('');
  } else if (url.startsWith('github.com/')) {
    url = url.split('github.com/').join('');
  } else if (url.startsWith('git@github.com:') && url.endsWith('.git')) {
    url = url.split('git@github.com:').join('');
    url = url.split('.git').join('');
  } else if (url.includes('/')) {
  } else {
    throw new Error('Unknown format');
  }

  [owner, repo] = url.split('/');

  const {
    data: { default_branch },
  } = await octokit.rest.repos.get({ owner, repo });

  let {
    data: { tree },
  } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: default_branch,
    recursive: true,
  });

  const data = await Promise.allSettled(
    tree
      .filter((r) => r.path.endsWith('.md'))
      .map((r) => {
        return octokit.rest.repos.getContent({
          owner,
          repo,
          path: r.path,
        });
      }),
  );

  return {
    repo,
    files: data
      .filter((r) => r.status === 'fulfilled')
      .map(
        ({
          value: {
            data: { path, content },
          },
        }) => {
          return { path, textContent: atob(content) };
        },
      ),
  };
}

Promise.allSettled =
  Promise.allSettled ||
  ((promises) =>
    Promise.all(
      promises.map((p) =>
        p
          .then((v) => ({
            status: 'fulfilled',
            value: v,
          }))
          .catch((e) => ({
            status: 'rejected',
            reason: e,
          })),
      ),
    ));
