/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { setupTestExtension, waitForExpect } from '@bangle.io/test-utils-2';
import { Extension, nsmApi2 } from '@bangle.io/api';
import { githubEffects, nsmGhSlice } from '../state';
import githubExt from '../index';
import { githubSyncEffect, githubWorkspaceEffect } from '../state/effects';
import { GITHUB_STORAGE_PROVIDER_NAME, GithubWsMetadata } from '../common';
import { updateGhToken } from '../database';
import { getFileBlobFromTree, getRepoTree } from '../github-api-helpers';
import { githubGraphqlFetch, githubRestFetch } from '../github-fetch';
import { EffectCreator } from '@bangle.io/nsm-3';

let abortController = new AbortController();
const ext = githubExt;
const originalEffects = [...githubEffects];

const githubWsMetadata = {
  owner: 'test-owner',
  branch: 'test-branch',
} satisfies GithubWsMetadata;

jest.mock('../github-fetch', () => {
  return {
    githubGraphqlFetch: jest.fn().mockImplementation(async () => {
      return new Response('{}', { status: 200 });
    }),
    githubRestFetch: jest.fn().mockImplementation(async () => {
      return new Response('{}', { status: 200 });
    }),
  };
});

const githubGraphqlFetchMocked = jest.mocked(githubGraphqlFetch);

const githubRestFetchMocked = jest.mocked(githubRestFetch);

function overrideEffects(effects: EffectCreator[]) {
  const ext = githubExt;
  if (ext.application) {
    ext.application.nsmEffects = effects;
  }
}

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(async () => {
  abortController.abort();
  overrideEffects(originalEffects);

  githubRestFetchMocked.mockImplementation(async () => {
    return new Response('{}', { status: 200 });
  });
  githubGraphqlFetchMocked.mockImplementation(async () => {
    return new Response('{}', { status: 200 });
  });
});

test('no effects', async () => {
  const ext = githubExt;
  overrideEffects([]);

  const ctx = await setupTestExtension({
    extensions: [ext],
    abortSignal: abortController.signal,
  });

  await ctx.createWorkspace('test-w1');
});

describe('basic syncing', () => {
  beforeEach(() => {
    overrideEffects([githubWorkspaceEffect, githubSyncEffect]);
  });

  const setup = async () => {
    githubRestFetchMocked.mockImplementation(async ({ path }) => {
      const latestSha = `46f906403dd296361555a5aac696d5d79e2ba4ea`;

      if (
        path.includes(`/git/trees/${githubWsMetadata.branch}`) ||
        path.includes(`/git/trees/${latestSha}`)
      ) {
        return new Response(
          JSON.stringify({
            sha: latestSha,
            url: `https://api.github.com/repos/kepta/awesome-privacy/git/trees/${latestSha}`,
            tree: [
              {
                path: 'dearest-step.md',
                mode: '100644',
                type: 'blob',
                sha: '1944ba972cd5a052c5ca8999fe572341e41009e1',
                size: 62,
                url: 'https://api.github.com/repos/kepta/awesome-privacy/git/blobs/1944ba972cd5a052c5ca8999fe572341e41009e1',
              },
              {
                path: 'digital-advantage.md',
                mode: '100644',
                type: 'blob',
                sha: 'b9777d2858a0cbca135d57f24233fdd32a6366a5',
                size: 47,
                url: 'https://api.github.com/repos/kepta/awesome-privacy/git/blobs/b9777d2858a0cbca135d57f24233fdd32a6366a5',
              },
              {
                path: 'misc',
                mode: '040000',
                type: 'tree',
                sha: 'dbbbc64b21eccbeb459840a36c9ca3ab4d1d9c42',
                url: 'https://api.github.com/repos/kepta/awesome-privacy/git/trees/dbbbc64b21eccbeb459840a36c9ca3ab4d1d9c42',
              },
              {
                path: 'misc/ABOUT.md',
                mode: '100644',
                type: 'blob',
                sha: 'ec7bffa7bf87956129779d06007ac9d4ae6b26a8',
                size: 1725,
                url: 'https://api.github.com/repos/kepta/awesome-privacy/git/blobs/ec7bffa7bf87956129779d06007ac9d4ae6b26a8',
              },
              {
                path: 'misc/Contributing.md',
                mode: '100644',
                type: 'blob',
                sha: 'b8c7ab677350242d2403d4eb17ad0f5542791043',
                size: 1365,
                url: 'https://api.github.com/repos/kepta/awesome-privacy/git/blobs/b8c7ab677350242d2403d4eb17ad0f5542791043',
              },
            ],
            truncated: false,
          }),
          {
            status: 200,
          },
        );
      }

      // gets the latest commit message
      if (path.includes(`/commits/${githubWsMetadata.branch}`)) {
        return new Response(
          JSON.stringify({
            sha: latestSha,
          }),
          {
            status: 200,
          },
        );
      }

      console.warn('no match', path);

      return new Response('{}', { status: 200 });
    });

    githubGraphqlFetchMocked.mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          createCommitOnBranch: {
            commit: {
              url: 'https://github.com/kepta/awesome-privacy/commit/46f906403dd296361555a5aac696d5d79e2ba4ea',
              oid: '46f906403dd296361555a5aac696d5d79e2ba4ea',
            },
          },
        }),
        {
          status: 200,
        },
      );
    });
    return {};
  };

  test('githubWorkspaceEffect', async () => {
    await setup();
    const ext = githubExt;

    const ctx = await setupTestExtension({
      extensions: [ext],
      abortSignal: abortController.signal,
    });

    await updateGhToken('test-token');

    await ctx.createWorkspace(
      'test-w1',
      GITHUB_STORAGE_PROVIDER_NAME,
      githubWsMetadata,
    );

    await waitForExpect(() => {
      expect(nsmGhSlice.get(ctx.testStore.state).githubWsName).toBe('test-w1');
    });

    // switching to non github workspace
    await ctx.createWorkspace('test-w2');

    await waitForExpect(() => {
      expect(nsmGhSlice.get(ctx.testStore.state).githubWsName).toBe(undefined);
    });
  });

  test('reads existing notes in github', async () => {
    await setup();
    const ext = githubExt;

    const ctx = await setupTestExtension({
      extensions: [ext],
      abortSignal: abortController.signal,
      editor: true,
    });

    await updateGhToken('test-token');

    await ctx.createWorkspace(
      'test-w1',
      GITHUB_STORAGE_PROVIDER_NAME,
      githubWsMetadata,
    );

    await waitForExpect(() => {
      expect(nsmGhSlice.get(ctx.testStore.state).githubWsName).toBe('test-w1');
    });

    await waitForExpect(() => {
      expect(nsmApi2.workspace.workspaceState().noteWsPaths?.length).toBe(4);
    });

    expect(nsmApi2.workspace.workspaceState().noteWsPaths)
      .toMatchInlineSnapshot(`
      [
        "test-w1:dearest-step.md",
        "test-w1:digital-advantage.md",
        "test-w1:misc/ABOUT.md",
        "test-w1:misc/Contributing.md",
      ]
    `);

    await ctx.createNotes([['test-w1:test-file.md', 'Hello world']]);

    await waitForExpect(() => {
      expect(nsmApi2.workspace.workspaceState().noteWsPaths?.length).toBe(5);
    });

    expect(nsmApi2.workspace.workspaceState().noteWsPaths)
      .toMatchInlineSnapshot(`
      [
        "test-w1:test-file.md",
        "test-w1:dearest-step.md",
        "test-w1:digital-advantage.md",
        "test-w1:misc/ABOUT.md",
        "test-w1:misc/Contributing.md",
      ]
    `);
  });
});
