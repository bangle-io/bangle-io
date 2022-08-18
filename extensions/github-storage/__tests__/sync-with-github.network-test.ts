import waitForExpect from 'wait-for-expect';

import type { BangleApplicationStore } from '@bangle.io/api';
import { workspace, wsPathHelpers } from '@bangle.io/api';
import { RemoteFileEntry } from '@bangle.io/remote-file-sync';
import { createBasicTestStore, createPMNode } from '@bangle.io/test-utils';
import { randomStr, sleep } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import * as github from '../github-api-helpers';
import type { GithubWsMetadata } from '../helpers';
import { getDatabase } from '../helpers';
import GithubStorageExt from '../index';
import { pushLocalChanges } from '../sync-with-github';

let githubWsMetadata: GithubWsMetadata;

jest.setTimeout(30000);
jest.retryTimes(2);

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
let wsName: string, store: BangleApplicationStore;
let abortController = new AbortController();

beforeEach(async () => {
  githubWsMetadata = {
    owner: githubOwner,
    branch: 'main',
    githubToken: githubToken,
  };

  abortController = new AbortController();
  wsName = 'bangle-test-' + randomStr() + Date.now();
  await github.createRepo({
    description: 'Created by Bangle.io tests',
    config: {
      ...githubWsMetadata,
      repoName: wsName,
    },
  });

  ({ store } = createBasicTestStore({
    signal: abortController.signal,
    slices: [],
    extensions: [GithubStorageExt],
    onError: (err) => {
      throw err;
    },
  }));

  await workspace.createWorkspace(
    wsName,
    GITHUB_STORAGE_PROVIDER_NAME,
    githubWsMetadata,
  )(store.state, store.dispatch, store);

  defaultNoteWsPath = `${wsName}:welcome-to-bangle.md`;

  await sleep(50);
  await getNoteAsString(defaultNoteWsPath);
});

afterAll(async () => {
  // wait for network requests to finish
  await sleep(200);
});

afterEach(async () => {
  abortController.abort();
  store.destroy();
});

const getNoteAsString = async (wsPath: string): Promise<string | undefined> => {
  return (
    await workspace.getNote(wsPath)(store.state, store.dispatch, store)
  )?.toString();
};

const getLocalFileEntries = async () => {
  return Object.fromEntries(
    (
      await localFileEntryManager(getDatabase(store.state)).getAllEntries('')
    ).map((entry) => [entry.uid, entry]),
  );
};

let getTree = github.getRepoTree();
const getRemoteFileEntries = async () => {
  const tree = await getTree({
    abortSignal: abortController.signal,
    config: {
      repoName: wsName,
      ...githubWsMetadata,
    },
    wsName,
  });

  return Object.fromEntries(
    await Promise.all(
      [...tree.tree.values()].map(
        async (item): Promise<[string, RemoteFileEntry]> => {
          const { wsName, fileName } = wsPathHelpers.resolvePath(
            item.wsPath,
            true,
          );
          const file = await github.getFileBlob({
            abortSignal: abortController.signal,
            config: {
              repoName: wsName,
              ...githubWsMetadata,
            },
            fileBlobUrl: item.url,
            fileName,
          });

          return [
            item.wsPath,
            await RemoteFileEntry.newFile({
              uid: item.wsPath,
              file: file,
              deleted: undefined,
            }),
          ];
        },
      ),
    ),
  );
};

const push = async (retainedWsPaths = new Set<string>()) => {
  return pushLocalChanges({
    abortSignal: abortController.signal,
    fileEntryManager: localFileEntryManager(getDatabase(store.state)),
    ghConfig: githubWsMetadata,
    retainedWsPaths,
    tree: await getTree({
      abortSignal: abortController.signal,
      config: {
        repoName: wsName,
        ...githubWsMetadata,
      },
      wsName,
    }),
    wsName,
  });
};

describe('pushLocalChanges', () => {
  test('when a new note is created locally and then modified, remote should be updated correctly', async () => {
    const test1WsPath = `${wsName}:bunny/test-1.md`;

    await workspace.createNote(test1WsPath, {
      doc: createPMNode([], `hello I am test-1 note`),
    })(store.state, store.dispatch, store);

    let localEntries = await getLocalFileEntries();
    let remoteEntries = await getRemoteFileEntries();

    // test1WsPath should not exist in remote at this point
    expect(remoteEntries[test1WsPath]).toBeUndefined();

    // local entry should have isNew flag to true since we just created it
    expect(localEntries[test1WsPath]?.isDeleted).toEqual(false);
    expect(localEntries[test1WsPath]?.isModified).toEqual(true);
    expect(localEntries[test1WsPath]?.isNew).toEqual(true);
    expect(localEntries[test1WsPath]?.isUntouched).toEqual(false);
    expect(localEntries[test1WsPath]?.source).toBe(undefined);

    await push();

    remoteEntries = await getRemoteFileEntries();

    // test1WsPath should exist now
    expect(remoteEntries[test1WsPath]).toMatchObject({
      deleted: undefined,
      file: expect.any(File),
      sha: '2ebd920b7785f6853391c83ac1852719151ab503',
      uid: test1WsPath,
    });

    // Update the test-1 note with new content
    await workspace.writeNote(
      test1WsPath,
      createPMNode([], `hello I am updated test-1`),
    )(store.state, store.dispatch, store);

    // Get the latest local entries since we updated the note
    localEntries = await getLocalFileEntries();

    expect(localEntries[test1WsPath]?.isDeleted).toEqual(false);
    // local entry should have isModified flag to true since we updated it but didnt sync
    expect(localEntries[test1WsPath]?.isModified).toEqual(true);
    expect(localEntries[test1WsPath]?.isNew).toEqual(false);
    expect(localEntries[test1WsPath]?.isUntouched).toEqual(false);
    expect(localEntries[test1WsPath]?.source).toBeDefined();

    await push();

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

    expect(localEntries[test1WsPath]?.isDeleted).toEqual(false);
    // local entry should have isModified flag to false since we synced it to remote
    expect(localEntries[test1WsPath]?.isModified).toEqual(false);
    expect(localEntries[test1WsPath]?.isNew).toEqual(false);
    expect(localEntries[test1WsPath]?.isUntouched).toEqual(true);
    expect(localEntries[test1WsPath]?.source).toBeDefined();
  });

  describe('Tests with two local notes', () => {
    let test1WsPath: string, test2WsPath: string;

    beforeEach(async () => {
      test1WsPath = `${wsName}:bunny/test-1.md`;
      test2WsPath = `${wsName}:bunny/test-2.md`;

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getLatestCommitSha({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, repoName: wsName },
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

      // syncing with github will create a local entry for test-1.md
      expect(await getNoteAsString(test1WsPath)).toContain(`I am test-1`);
      expect(await getNoteAsString(test2WsPath)).toContain(`I am test-2`);
    });

    test('deleting both local notes should make corresponding remote notes undefined', async () => {
      let localEntries = await getLocalFileEntries();
      expect(localEntries[test1WsPath]?.isDeleted).toBe(false);
      expect(localEntries[test2WsPath]?.isDeleted).toBe(false);

      // delete the note locally and then sync
      await workspace.deleteNote(test1WsPath)(
        store.state,
        store.dispatch,
        store,
      );
      await workspace.deleteNote(test2WsPath)(
        store.state,
        store.dispatch,
        store,
      );

      await sleep(0);

      // make sure local entry is marked as deleted
      localEntries = await getLocalFileEntries();
      expect(localEntries[test1WsPath]?.isDeleted).toBe(true);
      expect(localEntries[test1WsPath]?.isNew).toBe(false);
      expect(localEntries[test1WsPath]?.isModified).toBe(false);
      expect(localEntries[test1WsPath]?.isUntouched).toBe(false);

      expect(localEntries[test2WsPath]?.isDeleted).toBe(true);

      let remoteEntries = await getRemoteFileEntries();
      expect(remoteEntries[test1WsPath]?.uid).toBe(test1WsPath);

      // push the deletion to github
      await push(new Set([test1WsPath, test2WsPath]));

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
      expect(localEntries[test1WsPath]?.isDeleted).toBe(false);
      expect(localEntries[test2WsPath]?.isDeleted).toBe(false);

      let originalSourceSha = localEntries[test1WsPath]?.source?.sha;

      expect(originalSourceSha).toBeDefined();

      await workspace.writeNote(
        test1WsPath,
        createPMNode([], `I am updated test-1`),
      )(store.state, store.dispatch, store);

      await workspace.deleteNote(test2WsPath)(
        store.state,
        store.dispatch,
        store,
      );

      await sleep(0);

      localEntries = await getLocalFileEntries();
      expect(localEntries[test2WsPath]?.isDeleted).toBe(true);

      expect(localEntries[test1WsPath]?.isDeleted).toBe(false);
      expect(localEntries[test1WsPath]?.isNew).toBe(false);
      expect(localEntries[test1WsPath]?.isModified).toBe(true);
      expect(localEntries[test1WsPath]?.isUntouched).toBe(false);
      expect(localEntries[test2WsPath]?.isModified).toBe(false);

      expect(localEntries[test1WsPath]?.sha).toBe(
        '4614e94430bc2af22a76817016bbecc34e71deca',
      );
      expect(localEntries[test1WsPath]?.sha).not.toBe(originalSourceSha);
      expect(localEntries[test1WsPath]?.source?.sha).toBe(originalSourceSha);

      let remoteEntries = await getRemoteFileEntries();
      expect(remoteEntries[test1WsPath]?.uid).toBe(test1WsPath);

      await push(new Set([test1WsPath, test2WsPath]));

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
    const test2WsPath = `${wsName}:bunny/test-2.md`;
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, repoName: wsName },
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

    workspace.refreshWsPaths()(store.state, store.dispatch);

    await waitForExpect(async () => {
      expect(
        await workspace.workspaceSliceKey.getSliceStateAsserted(store.state)
          .wsPaths,
      ).toEqual([`${wsName}:bunny`, test2WsPath, defaultNoteWsPath]);
    });
  });
});

describe('house keeping', () => {
  test('creates local for files that are in retained list but do not exist locally', async () => {
    let test1WsPath = `${wsName}:bunny/test-1.md`;
    let test2WsPath = `${wsName}:bunny/test-2.md`;

    // Make a direct remote change outside the realm of our app
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, repoName: wsName },
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

    await push(new Set([test1WsPath, test2WsPath]));

    // should pull in the notes in retained list and remove defaultNoteWsPath
    localEntries = await getLocalFileEntries();
    expect(Object.keys(localEntries).sort()).toEqual([
      test1WsPath,
      test2WsPath,
    ]);
  });

  test('removes local entry for files that are not modified', async () => {
    let localEntries = await getLocalFileEntries();

    expect(Object.keys(localEntries).sort()).toEqual([
      `${wsName}:welcome-to-bangle.md`,
    ]);

    await push(new Set());

    localEntries = await getLocalFileEntries();

    // should remove welcome to bangle
    expect(Object.keys(localEntries).sort()).toEqual([]);
  });

  test('does not remove a file if it is in retained list', async () => {
    let localEntries = await getLocalFileEntries();

    expect(Object.keys(localEntries)).toEqual([defaultNoteWsPath]);

    await push(new Set([defaultNoteWsPath]));

    localEntries = await getLocalFileEntries();

    // should not remove welcome to bangle since it was in retained list
    expect(Object.keys(localEntries)).toEqual([defaultNoteWsPath]);
  });

  test('removes a local entry that has been synced to github', async () => {
    const test1WsPath = `${wsName}:bunny/test-1.md`;

    await workspace.createNote(test1WsPath, {
      doc: createPMNode([], `hello I am test-1 note`),
    })(store.state, store.dispatch, store);

    let localEntries = await getLocalFileEntries();

    expect(Object.keys(localEntries).sort()).toEqual([
      `${wsName}:bunny/test-1.md`,
      defaultNoteWsPath,
    ]);

    await push(new Set());

    localEntries = await getLocalFileEntries();
    let remoteEntries = await getRemoteFileEntries();

    // removes default but not test-1 since it was not synced to github
    expect(Object.keys(localEntries).sort()).toEqual([
      `${wsName}:bunny/test-1.md`,
    ]);

    // sync test-1 with github
    await push();

    await push(new Set());

    localEntries = await getLocalFileEntries();

    // should remove all
    expect(Object.keys(localEntries).sort()).toEqual([]);
  });

  test('if source gets out of sync it gets fixed in next sync', async () => {
    const test1WsPath = `${wsName}:bunny/test-1.md`;

    await workspace.createNote(test1WsPath, {
      doc: createPMNode([], `hello I am test-1 note`),
    })(store.state, store.dispatch, store);

    await push(new Set([test1WsPath]));

    let localEntries = await getLocalFileEntries();

    let remoteEntries = await getRemoteFileEntries();

    expect(remoteEntries[test1WsPath]).toBeDefined();

    const sha = localEntries[test1WsPath]?.sha;
    const sourceSha = localEntries[test1WsPath]?.source?.sha;

    expect(sha).toBe(sourceSha);

    // // corrupt the source
    await localFileEntryManager(getDatabase(store.state)).updateFileSource(
      test1WsPath,
      new File(
        [new Blob(['hi'], { type: 'text/plain' })],
        'test-1-corrupted.md',
      ),
    );

    localEntries = await getLocalFileEntries();

    const corruptedSourceSha = localEntries[test1WsPath]?.source?.sha;

    expect(corruptedSourceSha).not.toEqual(sourceSha);

    await push(new Set([test1WsPath]));

    localEntries = await getLocalFileEntries();

    // // source should get back to original
    expect(localEntries[test1WsPath]?.source?.sha).toBe(sourceSha);
  });
});
