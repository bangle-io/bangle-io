/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { nsm, nsmApi2, wsPathHelpers } from '@bangle.io/api';
import { calculateGitFileSha } from '@bangle.io/git-file-sha';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';
import {
  isEntryDeleted,
  isEntryModified,
  isEntryNew,
  isEntryUntouched,
  makeLocalEntryFromRemote,
} from '@bangle.io/remote-file-sync';
import { setupTestExtension, waitForExpect } from '@bangle.io/test-utils-2';
import { randomStr, sleep } from '@bangle.io/utils';

import type { GithubWsMetadata } from '../common';
import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { updateGhToken } from '../database';
import { fileEntryManager } from '../file-entry-manager';
import * as github from '../github-api-helpers';
import {
  discardLocalEntryChanges,
  duplicateAndResetToRemote,
  getConflicts,
  githubSync,
  optimizeDatabase,
} from '../github-sync';
import GithubStorageExt from '../index';
import { createWsPath } from '@bangle.io/ws-path';
import { WsPath } from '@bangle.io/shared-types';

let githubWsMetadata: any;

jest.setTimeout(30000);
jest.retryTimes(3);

// WARNING: This is a network test and depends on github API.
//          It will create a bunch of repositories and commits.
//          It is recommended to use a dummy account.

// eslint-disable-next-line no-process-env
const githubOwner = process.env.GITHUB_OWNER as string;
// eslint-disable-next-line no-process-env
const githubToken = process.env.GITHUB_TOKEN as string;

if (!githubToken) {
  console.error(
    `Running this test will spam your account with a bunch of repos, it is strongly recommended to use a dummy account or run this test in CI.
Please make sure your Github token has write repo access.`,
  );
  throw new Error('env var GITHUB_TOKEN is not set.');
}
if (!githubOwner) {
  throw new Error(
    'env var GITHUB_OWNER is not set. This is the owner of the github token.',
  );
}

let defaultNoteWsPath: string;
let wsName: string;
let abortController = new AbortController();

beforeEach(async () => {
  await updateGhToken(githubToken);

  githubWsMetadata = {
    owner: githubOwner,
    branch: 'main',
  } satisfies GithubWsMetadata;

  abortController = new AbortController();
  wsName = 'bangle-test-' + randomStr() + Date.now();
  await github.createRepo({
    description: 'Created by Bangle.io tests',
    config: {
      githubToken,
      ...githubWsMetadata,
      repoName: wsName,
    },
  });

  await sleep(50);
});

const setup = async () => {
  const ctx = await setupTestExtension({
    editor: true,
    extensions: [GithubStorageExt],
    abortSignal: abortController.signal,
  });

  await ctx.createWorkspace(
    wsName,
    GITHUB_STORAGE_PROVIDER_NAME,
    githubWsMetadata,
  );

  defaultNoteWsPath = `${wsName}:welcome-to-bangle.md`;

  await getNoteAsString(defaultNoteWsPath);

  return ctx;
};

afterAll(async () => {
  // wait for network requests to finish
  await sleep(100);
});

afterEach(async () => {
  abortController.abort();
  await sleep(50);
});

const getNoteAsString = async (wsPath: string): Promise<string | undefined> => {
  return (await nsmApi2.workspace.getNote(createWsPath(wsPath)))?.toString();
};

const getLocalFileEntries = async () => {
  return Object.fromEntries(
    (await fileEntryManager.listAllEntries(wsName)).map((entry) => [
      entry.uid,
      entry,
    ]),
  );
};

let getTree = github.getRepoTree();

const getRemoteFileEntries = async () => {
  const tree = await getTree({
    abortSignal: abortController.signal,
    config: {
      repoName: wsName,
      ...githubWsMetadata,
      githubToken,
    },
    wsName,
  });

  return Object.fromEntries(
    await Promise.all(
      [...tree.tree.values()].map(
        async (item): Promise<[string, PlainObjEntry]> => {
          const { wsName, fileName } = wsPathHelpers.resolvePath(
            item.wsPath,
            true,
          );
          const file = await github.getFileBlob({
            abortSignal: abortController.signal,
            config: {
              repoName: wsName,
              ...githubWsMetadata,
              githubToken,
            },
            fileBlobUrl: item.url,
            fileName,
          });

          return [
            item.wsPath,
            makeLocalEntryFromRemote({
              uid: item.wsPath,
              file: file,
              sha: await calculateGitFileSha(file),
            }),
          ];
        },
      ),
    ),
  );
};

const runGithubSync = async () => {
  const config = {
    repoName: wsName,
    ...githubWsMetadata,
    githubToken,
  };

  return githubSync({
    wsName,
    config: config,
    abortSignal: abortController.signal,
  });
};

const runOptimizeDatabase = async (retainedWsPaths: string[]) => {
  const config = {
    repoName: wsName,
    ...githubWsMetadata,
    githubToken,
  };

  return optimizeDatabase({
    abortSignal: abortController.signal,
    wsName,
    retainedWsPaths: new Set(retainedWsPaths),
    pruneUnused: true,
    config,
    tree: await getTree({
      abortSignal: abortController.signal,
      config,
      wsName,
    }),
  });
};

describe('pushLocalChanges', () => {
  test('when a new note is created locally and then modified, remote should be updated correctly', async () => {
    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);

    const ctx = await setup();
    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    let localEntries = await getLocalFileEntries();
    let remoteEntries = await getRemoteFileEntries();

    // test1WsPath should not exist in remote at this point
    expect(remoteEntries[test1WsPath]).toBeUndefined();

    // local entry should have isNew flag to true since we just created it
    expect(isEntryDeleted(localEntries[test1WsPath]!)).toEqual(false);
    expect(isEntryModified(localEntries[test1WsPath]!)).toEqual(true);
    expect(isEntryNew(localEntries[test1WsPath]!)).toEqual(true);
    expect(isEntryUntouched(localEntries[test1WsPath]!)).toEqual(false);
    expect(localEntries[test1WsPath]?.source).toBe(undefined);

    await runGithubSync();

    remoteEntries = await getRemoteFileEntries();

    // test1WsPath should exist now
    expect(remoteEntries[test1WsPath]).toMatchObject({
      deleted: undefined,
      file: expect.any(File),
      sha: '2ebd920b7785f6853391c83ac1852719151ab503',
      uid: test1WsPath,
    });

    // Update the test-1 note with new content

    await nsmApi2.workspace.writeNoteFromMd(
      test1WsPath,
      `hello I am updated test-1`,
    );

    // Get the latest local entries since we updated the note
    localEntries = await getLocalFileEntries();

    expect(isEntryDeleted(localEntries[test1WsPath]!)).toEqual(false);
    // local entry should have isModified flag to true since we updated it but didnt sync
    expect(isEntryModified(localEntries[test1WsPath]!)).toEqual(true);
    expect(isEntryNew(localEntries[test1WsPath]!)).toEqual(false);
    expect(isEntryUntouched(localEntries[test1WsPath]!)).toEqual(false);
    expect(localEntries[test1WsPath]?.source).toBeDefined();

    await runGithubSync();

    await sleep(100);
    remoteEntries = await getRemoteFileEntries();
    localEntries = await getLocalFileEntries();

    expect(remoteEntries[test1WsPath]).toMatchObject({
      deleted: undefined,
      file: expect.any(File),
      sha: 'd482275223a9de686c94e439183f64d670165758',
      uid: test1WsPath,
    });
    expect(localEntries[test1WsPath]).toMatchObject({
      deleted: undefined,
      file: expect.any(File),
      sha: 'd482275223a9de686c94e439183f64d670165758',
      uid: test1WsPath,
      source: {
        // source sha should match the local sha to signify that the local file
        // is now unmodified
        sha: 'd482275223a9de686c94e439183f64d670165758',
        file: expect.any(File),
      },
    });

    expect(isEntryDeleted(localEntries[test1WsPath]!)).toEqual(false);
    // local entry should have isModified flag to false since we synced it to remote
    expect(isEntryModified(localEntries[test1WsPath]!)).toEqual(false);
    expect(isEntryNew(localEntries[test1WsPath]!)).toEqual(false);
    expect(isEntryUntouched(localEntries[test1WsPath]!)).toEqual(true);
    expect(localEntries[test1WsPath]?.source).toBeDefined();
  });

  describe('Tests with two local notes', () => {
    let test1WsPath: WsPath, test2WsPath: WsPath;

    beforeEach(async () => {
      test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);
      test2WsPath = createWsPath(`${wsName}:bunny/test-2.md`);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getLatestCommitSha({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: wsPathHelpers.resolvePath(test1WsPath).filePath,
            base64Content: btoa('I am test-1'),
          },
          {
            path: wsPathHelpers.resolvePath(test2WsPath).filePath,
            base64Content: btoa('I am test-2'),
          },
        ],
        deletions: [],
      });
      await setup();

      // syncing with github will create a local entry for test-1.md
      expect(await getNoteAsString(test1WsPath)).toContain(`I am test-1`);
      expect(await getNoteAsString(test2WsPath)).toContain(`I am test-2`);
    });

    test('deleting both local notes should make corresponding remote notes undefined', async () => {
      let localEntries = await getLocalFileEntries();
      expect(isEntryDeleted(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryDeleted(localEntries[test2WsPath]!)).toBe(false);

      // delete the note locally and then sync
      await nsmApi2.workspace.deleteNote(test1WsPath);
      await nsmApi2.workspace.deleteNote(test2WsPath);

      await sleep(0);

      // make sure local entry is marked as deleted
      localEntries = await getLocalFileEntries();
      expect(isEntryDeleted(localEntries[test1WsPath]!)).toBe(true);
      expect(isEntryNew(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryModified(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryUntouched(localEntries[test1WsPath]!)).toBe(false);

      expect(isEntryDeleted(localEntries[test2WsPath]!)).toBe(true);

      let remoteEntries = await getRemoteFileEntries();
      expect(remoteEntries[test1WsPath]?.uid).toBe(test1WsPath);

      // push the deletion to github
      await runGithubSync();

      // remote entry for test1 & test2 should become undefined
      remoteEntries = await getRemoteFileEntries();
      expect(remoteEntries[test1WsPath]).toBe(undefined);
      expect(remoteEntries[test2WsPath]).toBe(undefined);

      // once changes have been pushed to github, local entries should be removed
      // completely from the system
      localEntries = await getLocalFileEntries();
      expect(localEntries[test1WsPath]).toBeUndefined();
      expect(await getNoteAsString(test1WsPath)).toBeUndefined();
    });

    test('update one of the local notes and deleting other should reflect on the remote side correctly', async () => {
      let localEntries = await getLocalFileEntries();
      expect(isEntryDeleted(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryDeleted(localEntries[test2WsPath]!)).toBe(false);

      let originalSourceSha = localEntries[test1WsPath]?.source?.sha;

      expect(originalSourceSha).toBeDefined();

      await nsmApi2.workspace.writeNoteFromMd(
        test1WsPath,
        `I am updated test-1`,
      );

      await nsmApi2.workspace.deleteNote(test2WsPath);

      await sleep(0);

      localEntries = await getLocalFileEntries();
      expect(isEntryDeleted(localEntries[test2WsPath]!)).toBe(true);

      expect(isEntryDeleted(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryNew(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryModified(localEntries[test1WsPath]!)).toBe(true);
      expect(isEntryUntouched(localEntries[test1WsPath]!)).toBe(false);
      expect(isEntryModified(localEntries[test2WsPath]!)).toBe(false);

      expect(localEntries[test1WsPath]?.sha).toBe(
        '4614e94430bc2af22a76817016bbecc34e71deca',
      );
      expect(localEntries[test1WsPath]?.sha).not.toBe(originalSourceSha);
      expect(localEntries[test1WsPath]?.source?.sha).toBe(originalSourceSha);

      let remoteEntries = await getRemoteFileEntries();
      expect(remoteEntries[test1WsPath]?.uid).toBe(test1WsPath);

      await runGithubSync();

      remoteEntries = await getRemoteFileEntries();
      localEntries = await getLocalFileEntries();

      expect(remoteEntries[test1WsPath]?.uid).toBeDefined();
      expect(remoteEntries[test2WsPath]).toBe(undefined);

      // once github changes have been pushed, local entry for test2 should be removed
      // completely from the system
      expect(localEntries[test2WsPath]).toBeUndefined();

      expect(await getNoteAsString(test1WsPath)).toContain(
        'I am updated test-1',
      );
      expect(await getNoteAsString(test2WsPath)).toBeUndefined();
    });
  });

  test('ignores files with unsupported characters', async () => {
    const test2WsPath = createWsPath(`${wsName}:bunny/test-2.md`);
    await setup();

    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, githubToken, repoName: wsName },
      additions: [
        {
          path: 'bunny/:test-1.md',
          base64Content: btoa('I am test-1'),
        },
        {
          path: wsPathHelpers.resolvePath(test2WsPath).filePath,
          base64Content: btoa('I am test-2'),
        },
      ],
      deletions: [],
    });

    await sleep(300);

    nsmApi2.workspace.refresh();

    await waitForExpect(() => {
      expect(
        [...(nsmApi2.workspace.workspaceState().noteWsPaths ?? [])].sort(),
      ).toEqual([test2WsPath, defaultNoteWsPath].sort());
    });
  });

  test('if source gets out of sync it gets fixed in next sync', async () => {
    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);

    const ctx = await setup();
    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    await runGithubSync();

    let localEntries = await getLocalFileEntries();

    let remoteEntries = await getRemoteFileEntries();

    expect(remoteEntries[test1WsPath]).toBeDefined();

    const sha = localEntries[test1WsPath]?.sha;
    const sourceSha = localEntries[test1WsPath]?.source?.sha;

    expect(sha).toBe(sourceSha);

    // // corrupt the source
    await fileEntryManager.updateSource(
      test1WsPath,
      new File(
        [new Blob(['hi'], { type: 'text/plain' })],
        'test-1-corrupted.md',
      ),
    );

    localEntries = await getLocalFileEntries();

    const corruptedSourceSha = localEntries[test1WsPath]?.source?.sha;

    expect(corruptedSourceSha).not.toEqual(sourceSha);

    await runGithubSync();

    localEntries = await getLocalFileEntries();

    // // source should get back to original
    expect(localEntries[test1WsPath]?.source?.sha).toBe(sourceSha);
  });
});

describe('optimizeDatabase', () => {
  test('creates local for files that are in retained list but do not exist locally', async () => {
    let test1WsPath = `${wsName}:bunny/test-1.md`;
    let test2WsPath = `${wsName}:bunny/test-2.md`;

    const ctx = await setup();
    // Make a direct remote change outside the realm of our app
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, githubToken, repoName: wsName },
      additions: [
        {
          path: wsPathHelpers.resolvePath(test1WsPath).filePath,
          base64Content: btoa('I am test-1'),
        },
        {
          path: wsPathHelpers.resolvePath(test2WsPath).filePath,
          base64Content: btoa('I am test-2'),
        },
      ],
      deletions: [],
    });

    let localEntries = await getLocalFileEntries();
    expect(Object.keys(localEntries).sort()).toEqual([defaultNoteWsPath]);

    await runGithubSync();
    await runOptimizeDatabase([test1WsPath, test2WsPath]);

    // should pull in the notes in retained list and remove defaultNoteWsPath
    localEntries = await getLocalFileEntries();
    expect(Object.keys(localEntries).sort()).toEqual([
      test1WsPath,
      test2WsPath,
    ]);
  });

  test('removes local entry for files that are not modified', async () => {
    const ctx = await setup();
    let localEntries = await getLocalFileEntries();

    expect(Object.keys(localEntries).sort()).toEqual([
      `${wsName}:welcome-to-bangle.md`,
    ]);

    await runGithubSync();
    await runOptimizeDatabase([]);

    localEntries = await getLocalFileEntries();

    // should remove welcome to bangle

    await waitForExpect(() => {
      expect(Object.keys(localEntries).sort()).toEqual([]);
    });
  });

  test('does not remove a file if it is in retained list', async () => {
    const ctx = await setup();

    let localEntries = await getLocalFileEntries();

    expect(Object.keys(localEntries)).toEqual([defaultNoteWsPath]);

    await runGithubSync();
    await runOptimizeDatabase([defaultNoteWsPath]);

    localEntries = await getLocalFileEntries();

    // should not remove welcome to bangle since it was in retained list
    expect(Object.keys(localEntries)).toEqual([defaultNoteWsPath]);
  });

  test('removes a local entry that has been synced to github', async () => {
    const ctx = await setup();
    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);

    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    let localEntries = await getLocalFileEntries();

    expect(Object.keys(localEntries).sort()).toEqual([
      test1WsPath,
      defaultNoteWsPath,
    ]);

    await runGithubSync();

    await runOptimizeDatabase([]);

    localEntries = await getLocalFileEntries();

    // should remove all
    expect(Object.keys(localEntries).sort()).toEqual([]);

    // however, reading the note should still work
    expect(await getNoteAsString(test1WsPath)).toBeDefined();
    // and should bring back the note into local db
    localEntries = await getLocalFileEntries();
    expect(Object.keys(localEntries).sort()).toEqual([test1WsPath]);
  });
});

describe('discardLocalEntryChanges', () => {
  test('discards local changes', async () => {
    const ctx = await setup();

    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);

    // Setup the workspace so that we have a file that is in sync with github
    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    await runGithubSync();

    await sleep(50);

    let remoteEntries = await getRemoteFileEntries();

    expect(remoteEntries[test1WsPath]).toBeDefined();

    expect(isEntryUntouched((await getLocalFileEntries())[test1WsPath]!)).toBe(
      true,
    );

    // Now make a local change
    await nsmApi2.workspace.writeNoteFromMd(test1WsPath, `I am updated test-1`);

    expect(isEntryModified((await getLocalFileEntries())[test1WsPath]!)).toBe(
      true,
    );

    // Now discard the local changes
    expect(await discardLocalEntryChanges(test1WsPath)).toBe(true);

    expect(isEntryModified((await getLocalFileEntries())[test1WsPath]!)).toBe(
      false,
    );
    expect(isEntryUntouched((await getLocalFileEntries())[test1WsPath]!)).toBe(
      true,
    );
    expect((await getLocalFileEntries())[test1WsPath]?.sha).toBe(
      remoteEntries[test1WsPath]?.sha,
    );
  });

  test('if a file is deleted, it is brought back', async () => {
    const ctx = await setup();

    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);

    // Setup the workspace so that we have a file that is in sync with github
    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    await runGithubSync();

    await sleep(50);

    let remoteEntries = await getRemoteFileEntries();

    expect(remoteEntries[test1WsPath]).toBeDefined();

    await nsmApi2.workspace.deleteNote(test1WsPath);

    await waitForExpect(async () => {
      expect(
        typeof (await fileEntryManager.readEntry(test1WsPath))?.deleted ===
          'number',
      ).toBe(true);
    });

    // Now discard the local changes
    expect(await discardLocalEntryChanges(test1WsPath)).toBe(true);

    expect(
      (await fileEntryManager.readEntry(test1WsPath))?.deleted,
    ).toBeUndefined();
  });

  test('if file does not exist in remote it gets deleted', async () => {
    const ctx = await setup();

    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);

    // Setup the workspace so that we have a file that is in sync with github
    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    expect(isEntryNew((await getLocalFileEntries())[test1WsPath]!)).toBe(true);

    // Now discard the local changes
    expect(await discardLocalEntryChanges(test1WsPath)).toBe(true);

    expect((await getLocalFileEntries())[test1WsPath]).toBeUndefined();
  });
});

describe('duplicateAndResetToRemote', () => {
  test('duplicates and resets file content', async () => {
    const ctx = await setup();

    const test1WsPath = createWsPath(`${wsName}:bunny/test-1.md`);
    const config = { ...githubWsMetadata, githubToken, repoName: wsName };

    // Setup the workspace so that we have a file that is in sync with github
    await ctx.createNotes([[test1WsPath, `hello I am test-1 note`]]);

    await runGithubSync();

    await sleep(50);
    // ensure file is now untouched i.e. in sync with github
    expect(isEntryUntouched((await getLocalFileEntries())[test1WsPath]!)).toBe(
      true,
    );

    // Now create a conflict
    await nsmApi2.workspace.writeNoteFromMd(
      test1WsPath,
      `I am now a different local note`,
    );

    // Make a direct remote change outside the realm of our app
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config,
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config,
      additions: [
        {
          path: wsPathHelpers.resolvePath(test1WsPath).filePath,
          base64Content: btoa('I am now a different note remote'),
        },
      ],
      deletions: [],
    });

    await sleep(50);

    let remoteEntries = await getRemoteFileEntries();
    let localEntries = await getLocalFileEntries();

    // things should be in conflict
    expect(remoteEntries[test1WsPath]?.sha).not.toBe(
      localEntries[test1WsPath]?.sha,
    );

    const conflicts = await getConflicts({ wsName, config });

    expect(conflicts).toEqual([test1WsPath]);

    const result = await duplicateAndResetToRemote({
      config,
      wsPath: test1WsPath,
    });

    expect(result?.remoteContentWsPath).toEqual(test1WsPath);
    expect(result?.localContentWsPath.includes('test-1')).toBe(true);
    expect(result?.localContentWsPath).toMatch(/-conflict-\d+\.md$/);

    let newLocalEntries = await getLocalFileEntries();

    // the local entry with remoteContent should match the remote sha
    expect(newLocalEntries[result?.remoteContentWsPath!]?.sha).toBe(
      remoteEntries[test1WsPath]?.sha,
    );

    // the local entry with localContent (one ending with -conflict) should match
    // the locally modified sha

    expect(newLocalEntries[result?.localContentWsPath!]?.sha).toBe(
      localEntries[test1WsPath]?.sha,
    );

    // there should no longer be a conflict
    expect(await getConflicts({ wsName, config })).toEqual([]);
  });
});
