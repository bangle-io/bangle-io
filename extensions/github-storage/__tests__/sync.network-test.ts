import waitForExpect from 'wait-for-expect';

import {
  BangleApplicationStore,
  notification,
  workspace,
  wsPathHelpers,
} from '@bangle.io/api';
import { LocalFileEntry, RemoteFileEntry } from '@bangle.io/remote-file-sync';
import { createBasicTestStore, createPMNode } from '@bangle.io/test-utils';
import { assertNotUndefined, randomStr, sleep } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import * as github from '../github-api-helpers';
import { GithubWsMetadata } from '../helpers';
import GithubStorageExt from '../index';
import { syncWithGithub } from '../operations';
import { pushLocalChanges } from '../sync2';

let githubWsMetadata: GithubWsMetadata;

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

let wsName: string, store: BangleApplicationStore;
let abortController = new AbortController();

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
    (await localFileEntryManager.getAllEntries()).map((entry) => [
      entry.uid,
      entry,
    ]),
  );
};

const getRemoteFileEntries = async () => {
  const tree = await github.getTree({
    abortSignal: abortController.signal,
    config: {
      repoName: wsName,
      ...githubWsMetadata,
    },
    wsName,
  });

  return Object.fromEntries(
    await Promise.all(
      tree.tree.map(async (item): Promise<[string, RemoteFileEntry]> => {
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
      }),
    ),
  );
};

const push = async ({
  entries,
  sha,
}: {
  entries: Parameters<typeof pushLocalChanges>[0];
  sha?: string;
}) => {
  return pushLocalChanges(
    entries,
    abortController.signal,
    wsName,
    githubWsMetadata,
    sha ||
      (await github.getBranchHead({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, repoName: wsName },
      })),
    localFileEntryManager,
  );
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

    await push({
      entries: new Map([
        [
          defaultNoteWsPath,
          {
            local: localEntries[defaultNoteWsPath]!,
            remote: remoteEntries[defaultNoteWsPath],
          },
        ],
        [
          test1WsPath,
          {
            local: localEntries[test1WsPath]!,
            remote: remoteEntries[test1WsPath],
          },
        ],
      ]),
    });

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

    await push({
      entries: new Map([
        [
          defaultNoteWsPath,
          {
            local: localEntries[defaultNoteWsPath]!,
            remote: remoteEntries[defaultNoteWsPath],
          },
        ],
        [
          test1WsPath,
          {
            local: localEntries[test1WsPath]!,
            remote: remoteEntries[test1WsPath],
          },
        ],
      ]),
    });

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

      await syncWithGithub(
        wsName,
        abortController.signal,
        localFileEntryManager,
      )(store.state, store.dispatch, store);

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
      await push({
        entries: new Map([
          [
            defaultNoteWsPath,
            {
              local: localEntries[defaultNoteWsPath]!,
              remote: remoteEntries[defaultNoteWsPath],
            },
          ],
          [
            test1WsPath,
            {
              local: localEntries[test1WsPath]!,
              remote: remoteEntries[test1WsPath],
            },
          ],
          [
            test2WsPath,
            {
              local: localEntries[test2WsPath]!,
              remote: remoteEntries[test2WsPath],
            },
          ],
        ]),
      });

      // remote entry for test1 & test2 should become undefined
      remoteEntries = await getRemoteFileEntries();
      expect(remoteEntries[test1WsPath]).toBe(undefined);
      expect(remoteEntries[test2WsPath]).toBe(undefined);

      // local entry should stay as deleted
      localEntries = await getLocalFileEntries();
      expect(localEntries[test1WsPath]?.isDeleted).toBe(true);

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

      await push({
        entries: new Map([
          [
            defaultNoteWsPath,
            {
              local: localEntries[defaultNoteWsPath]!,
              remote: remoteEntries[defaultNoteWsPath],
            },
          ],
          [
            test1WsPath,
            {
              local: localEntries[test1WsPath]!,
              remote: remoteEntries[test1WsPath],
            },
          ],
          [
            test2WsPath,
            {
              local: localEntries[test2WsPath]!,
              remote: remoteEntries[test2WsPath],
            },
          ],
        ]),
      });

      remoteEntries = await getRemoteFileEntries();
      localEntries = await getLocalFileEntries();

      expect(remoteEntries[test1WsPath]?.uid).toBeDefined();
      expect(remoteEntries[test2WsPath]).toBe(undefined);

      expect(localEntries[test2WsPath]?.isModified).toBe(false);
      expect(localEntries[test2WsPath]?.isDeleted).toBe(true);

      expect(await getNoteAsString(test1WsPath)).toContain(
        'I am updated test-1',
      );
      expect(await getNoteAsString(test2WsPath)).toBeUndefined();
    });
  });
});
