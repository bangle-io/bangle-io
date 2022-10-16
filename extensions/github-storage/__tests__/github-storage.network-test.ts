import type { BangleApplicationStore } from '@bangle.io/api';
import { notification, workspace } from '@bangle.io/api';
import {
  isEntryDeleted,
  isEntryModified,
  isEntryNew,
  isEntryUntouched,
  makeLocallyCreatedEntry,
} from '@bangle.io/remote-file-sync';
import {
  createBasicTestStore,
  createPMNode,
  waitForExpect,
} from '@bangle.io/test-utils';
import { randomStr, sleep } from '@bangle.io/utils';

import type { GithubWsMetadata } from '../common';
import { ghSliceKey, GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { updateGhToken } from '../database';
import { fileEntryManager } from '../file-entry-manager';
import * as github from '../github-api-helpers';
import GithubStorageExt from '../index';
import { discardLocalChanges, syncRunner } from '../operations';

jest.setTimeout(30000);
jest.retryTimes(4);

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

let githubWsMetadata: GithubWsMetadata;
let defaultNoteWsPath: string;
let wsName: string,
  store: BangleApplicationStore,
  getAction: (name: string | RegExp) => any[];
let abortController = new AbortController();
let getTree = github.getRepoTree();
const getLocalEntry = async (wsPath: string) => {
  const entry = await fileEntryManager.readEntry(wsPath);

  return entry;
};

const existsInRemote = async (wsPath: string) => {
  const tree = await getTree({
    config: { ...githubWsMetadata, githubToken, repoName: wsName },
    wsName,
    abortSignal: abortController.signal,
  });

  return tree.tree.has(wsPath);
};

beforeEach(async () => {
  await updateGhToken(githubToken);

  githubWsMetadata = {
    owner: githubOwner,
    branch: 'main',
  };

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

  // make sure the repo is ready
  await waitForExpect(
    async () => {
      await sleep(500);
      expect(
        await github.hasRepo({
          config: {
            githubToken,
            ...githubWsMetadata,
            repoName: wsName,
          },
        }),
      ).toBe(true);
    },
    10000,
    500,
  );

  ({ store, getAction } = createBasicTestStore({
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

  await getNoteAsString(defaultNoteWsPath);
});

afterAll(async () => {
  // wait for network requests to finish
  await sleep(200);
});

afterEach(async () => {
  abortController.abort();
  store?.destroy();

  await sleep(100);
});

const getNoteAsString = async (wsPath: string): Promise<string | undefined> => {
  return (
    await workspace.getNote(wsPath)(store.state, store.dispatch, store)
  )?.toString();
};

const pullChanges = async () => {
  notification.clearAllNotifications()(store.state, store.dispatch);
  const result = await syncRunner(wsName, abortController.signal)(
    store.state,
    store.dispatch,
    store,
  );

  return result;
};

/**
 * The following table talks about change w.r.t
 * to the ancestor file.
 * | local\remote   | No Change | Modified | Deleted |
 * | -------------- | --------- | ------- | ------  |
 * | No Change      |   T1      |    T2   |   T3    |
 * | Modified        |   T4      |    T5   |   T6    |
 * | Deleted        |   T7      |    T8   |   T9    |
 */

describe('pull changes', () => {
  describe('T2, T3: remote note modified and/or deleted, local unchanged', () => {
    test('remote note modified, local unchanged', async () => {
      // this note is automatically created when setting up the workspace
      let note = await getNoteAsString(defaultNoteWsPath);
      expect(note?.toString()).toContain('Welcome to Bangle.io');

      expect(await fileEntryManager.listAllEntries(wsName)).toEqual([
        {
          deleted: undefined,
          sha: '97168e50a1841a6a409d9c1a3439913798b9f0f9',
          file: expect.any(File),
          source: {
            file: expect.any(File),
            sha: '97168e50a1841a6a409d9c1a3439913798b9f0f9',
          },
          uid: defaultNoteWsPath,
        },
      ]);

      // SHAs via these two APIs should always match as per Github API
      const sha = await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      });
      const tree = await getTree({
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        wsName,
        abortSignal: abortController.signal,
      });

      expect(sha).toEqual(tree.sha);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: sha,
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'welcome-to-bangle.md',
            base64Content: btoa('I am changed content'),
          },
        ],
        deletions: [],
      });

      // try getting the note
      note = await getNoteAsString(defaultNoteWsPath);
      // note should still point to the old content
      // because we have not synced yet.
      expect(note?.toString()).toEqual(
        `doc(heading("Welcome to Bangle.io"), paragraph("This is a sample note to get things started."))`,
      );

      await pullChanges();
      note = await getNoteAsString(defaultNoteWsPath);

      // note should now be updated
      expect(note?.toString()).toEqual(
        'doc(paragraph("I am changed content"))',
      );

      expect(await fileEntryManager.listAllEntries(wsName)).toEqual([
        {
          deleted: undefined,
          sha: 'abfe362253258d3aa6deaadbada5c02e52d0b7ad',
          file: expect.any(File),
          source: {
            file: expect.any(File),
            sha: 'abfe362253258d3aa6deaadbada5c02e52d0b7ad',
          },
          uid: defaultNoteWsPath,
        },
      ]);

      const entry = (await fileEntryManager.listAllEntries(wsName))[0]!;

      expect(isEntryModified(entry)).toBe(false);
    });

    test('variety of remote changes: deleted and another is modified', async () => {
      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'test-1.md',
            base64Content: btoa('I am test-1'),
          },
          {
            path: 'test-2.md',
            base64Content: btoa('I am test-2'),
          },
        ],
        deletions: [],
      });

      // app should make a network request and get this new note
      expect(
        await getNoteAsString(wsName + ':test-1.md'),
      ).toMatchInlineSnapshot(`"doc(paragraph("I am test-1"))"`);
      expect(
        await getNoteAsString(wsName + ':test-2.md'),
      ).toMatchInlineSnapshot(`"doc(paragraph("I am test-2"))"`);

      // // Make a direct remote change: delete test-1 and modify the other
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 2' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'test-2.md',
            base64Content: btoa('I am test-2 but modified'),
          },
        ],
        deletions: [
          {
            path: 'test-1.md',
          },
        ],
      });

      await pullChanges();

      // local copy test-1 should be deleted
      expect(await getNoteAsString(wsName + ':test-1.md')).toBeUndefined();
      expect(
        await getNoteAsString(wsName + ':test-2.md'),
      ).toMatchInlineSnapshot(`"doc(paragraph("I am test-2 but modified"))"`);

      workspace.refreshWsPaths()(store.state, store.dispatch);

      await waitForExpect(async () => {
        // store should only have two files left, the test-2.md and the default note
        expect(
          await workspace.workspaceSliceKey.getSliceStateAsserted(store.state)
            .wsPaths,
        ).toEqual([`${wsName}:test-2.md`, defaultNoteWsPath]);
      });
    });
  });

  describe('T3: remote deleted, local unchanged', () => {
    test('last remaining remote note is deleted, repo becomes empty', async () => {
      const sha = await github.getLatestCommitSha({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      });

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: sha,
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [],
        deletions: [
          {
            path: 'welcome-to-bangle.md',
          },
        ],
      });

      // try getting the note
      let note = await getNoteAsString(defaultNoteWsPath);
      // note should still point to the old content
      // because we have not synced yet.
      expect(note?.toString()).toContain('Welcome to Bangle.io');

      await pullChanges();

      note = await getNoteAsString(defaultNoteWsPath);
      // note should now be deleted
      expect(note).toBeUndefined();

      // local entry should be completely removed
      const defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(defaultEntry).toBeUndefined();
    });
  });

  describe('T4: remote unchanged, local modified', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await waitForExpect(async () => {
        expect(await getNoteAsString(defaultNoteWsPath)).toEqual(
          'doc(heading("Welcome to Bangle.io"), paragraph("This is a sample note to get things started."))',
        );
      });

      const modifiedText = `hello I am modified`;
      await workspace.writeNote(
        defaultNoteWsPath,
        createPMNode([], modifiedText),
      )(store.state, store.dispatch, store);

      await waitForExpect(async () => {
        expect(await getNoteAsString(defaultNoteWsPath)).toContain(
          modifiedText,
        );
      });

      let defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(isEntryModified(defaultEntry!)).toBe(true);
      expect(isEntryUntouched(defaultEntry!)).toBe(false);

      expect(await fileEntryManager.listAllEntries(wsName)).toEqual([
        {
          deleted: undefined,
          sha: 'b78abfa02cdcc8f4a4cbc92205a7856064e7f6b0',
          file: expect.any(File),
          source: {
            file: expect.any(File),
            sha: '97168e50a1841a6a409d9c1a3439913798b9f0f9',
          },
          uid: defaultNoteWsPath,
        },
      ]);

      await pullChanges();

      await waitForExpect(async () => {
        defaultEntry = await getLocalEntry(defaultNoteWsPath);
        expect(isEntryModified(defaultEntry!)).toBe(false);
      });

      defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(isEntryUntouched(defaultEntry!)).toBe(true);
    });
  });

  describe('T5: remote modified, local modified - conflict', () => {
    test('produces a conflict', async () => {
      // Make a direct remote change outside the realm of our app
      // setup up the two test notes
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'test-1.md',
            base64Content: btoa('I am test-1'),
          },
          {
            path: 'test-2.md',
            base64Content: btoa('I am test-2'),
          },
        ],
        deletions: [],
      });

      // open the test2 note
      workspace.pushWsPath(`${wsName}:test-2.md`)(store.state, store.dispatch);

      await waitForExpect(async () => {
        expect(await getNoteAsString(wsName + ':test-2.md')).toEqual(
          'doc(paragraph("I am test-2"))',
        );
      });

      await sleep(0);
      await pullChanges();

      // locally modify test-2 note
      const modifiedText = `test-2 hello I am modified`;
      await workspace.writeNote(
        `${wsName}:test-2.md`,
        createPMNode([], modifiedText),
      )(store.state, store.dispatch, store);

      expect(await getNoteAsString(wsName + ':test-2.md')).toContain(
        modifiedText,
      );

      // make an external change
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'test-1.md',
            base64Content: btoa('I am test-1 updated remotely'),
          },
          {
            path: 'test-2.md',
            base64Content: btoa('I am test-2 updated remotely'),
          },
        ],
        deletions: [],
      });

      await pullChanges();

      await waitForExpect(() => {
        expect(
          ghSliceKey.getSliceStateAsserted(store.state).conflictedWsPaths,
        ).toHaveLength(1);
      });

      // file should still be able to read the new changes

      expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
        'I am test-1 updated remotely',
      );

      // note 2 should not be updated as it was locally modified
      // FYI: this is a merge conflict situation
      expect(await getNoteAsString(wsName + ':test-2.md')).toContain(
        modifiedText,
      );
    });
  });

  describe('T6: local modified, remote deleted', () => {
    test('a note which was locally modified should not be updated if it was deleted upstream', async () => {
      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'test-1.md',
            base64Content: btoa('I am test-1'),
          },
          {
            path: 'test-2.md',
            base64Content: btoa('I am test-2'),
          },
        ],
        deletions: [],
      });

      let test2WsPath = `${wsName}:test-2.md`;

      await pullChanges();

      await getNoteAsString(wsName + ':test-2.md');
      // open test 2 in our app
      workspace.pushWsPath(test2WsPath)(store.state, store.dispatch);

      await waitForExpect(async () => {
        expect(await getNoteAsString(test2WsPath)).toContain('I am test-2');
      });

      // locally modify test-2 note
      const modifiedText = `test-2 hello I am modified`;

      await workspace.writeNote(test2WsPath, createPMNode([], modifiedText))(
        store.state,
        store.dispatch,
        store,
      );

      expect(await getNoteAsString(test2WsPath)).toContain(modifiedText);
      let test2Entry = await getLocalEntry(test2WsPath);
      expect(isEntryUntouched(test2Entry!)).toBe(false);

      // external change: delete test-2
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 2' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [],
        deletions: [
          {
            path: 'test-2.md',
          },
        ],
      });

      await sleep(50);
      expect(await existsInRemote(test2WsPath)).toBe(false);

      await pullChanges();
      expect(await existsInRemote(test2WsPath)).toBe(true);

      expect(await getNoteAsString(test2WsPath)).toContain(modifiedText);

      test2Entry = await getLocalEntry(test2WsPath);
      expect(isEntryUntouched(test2Entry!)).toBe(true);
      expect(isEntryDeleted(test2Entry!)).toBe(false);
    });
  });

  describe('T7: local deleted, remote unchanged', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await waitForExpect(async () => {
        expect(await getNoteAsString(defaultNoteWsPath)).toEqual(
          'doc(heading("Welcome to Bangle.io"), paragraph("This is a sample note to get things started."))',
        );
      });

      await workspace.deleteNote(defaultNoteWsPath)(
        store.state,
        store.dispatch,
        store,
      );

      expect(await existsInRemote(defaultNoteWsPath)).toBe(true);
      // local entry should be soft deleted until the sync
      let defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(isEntryDeleted(defaultEntry!)).toBe(true);
      await pullChanges();
      await sleep(50);

      expect(await existsInRemote(defaultNoteWsPath)).toBe(false);
      // local entry should be removed completely after syncing up the changes
      defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(defaultEntry!).toBeUndefined();
    });
  });

  describe('T8: local is deleted, remote is modified', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await waitForExpect(async () => {
        expect(await getNoteAsString(defaultNoteWsPath)).toEqual(
          'doc(heading("Welcome to Bangle.io"), paragraph("This is a sample note to get things started."))',
        );
      });

      await workspace.deleteNote(defaultNoteWsPath)(
        store.state,
        store.dispatch,
        store,
      );
      // local entry should be soft deleted
      let defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(isEntryDeleted(defaultEntry!)).toBe(true);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getLatestCommitSha({
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [
          {
            path: 'welcome-to-bangle.md',
            base64Content: btoa('I am changed content'),
          },
        ],
        deletions: [],
      });

      await pullChanges();
      await sleep(50);

      expect(await existsInRemote(defaultNoteWsPath)).toBe(true);
      // local entry's soft delete should be reverted
      defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(isEntryDeleted(defaultEntry!)).toBe(false);
      expect(isEntryUntouched(defaultEntry!)).toBe(true);

      expect(await getNoteAsString(defaultNoteWsPath)).toContain(
        'I am changed content',
      );
    });
  });

  describe('T9: local is deleted, remote is deleted', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await waitForExpect(async () => {
        expect(await getNoteAsString(defaultNoteWsPath)).toEqual(
          'doc(heading("Welcome to Bangle.io"), paragraph("This is a sample note to get things started."))',
        );
      });

      await workspace.deleteNote(defaultNoteWsPath)(
        store.state,
        store.dispatch,
        store,
      );
      // local entry should be soft deleted
      let defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(isEntryDeleted(defaultEntry!)).toBe(true);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getLatestCommitSha({
          config: { ...githubWsMetadata, githubToken, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
        additions: [],
        deletions: [{ path: 'welcome-to-bangle.md' }],
      });

      await pullChanges();
      await sleep(50);

      expect(await existsInRemote(defaultNoteWsPath)).toBe(false);
      defaultEntry = await getLocalEntry(defaultNoteWsPath);
      expect(defaultEntry).toBeUndefined();
      expect(await getNoteAsString(defaultNoteWsPath)).toBeUndefined();
    });
  });
});

describe('new note creation', () => {
  test('a new note is created locally and then deleted should have no effect on syncing', async () => {
    const wsPath = `${wsName}:test-1.md`;

    await workspace.createNote(wsPath)(store.state, store.dispatch, store);
    await sleep(0);

    expect(await getNoteAsString(wsPath)).toEqual(
      `doc(heading("test-1"), paragraph("Hello world!"))`,
    );

    let entry = await getLocalEntry(wsPath);
    expect(isEntryNew(entry!)).toBe(true);

    await workspace.deleteNote(wsPath)(store.state, store.dispatch, store);

    await sleep(0);
    entry = await getLocalEntry(wsPath);
    expect(isEntryNew(entry!)).toBe(true);
    expect(isEntryDeleted(entry!)).toBe(true);

    await sleep(0);
    await pullChanges();

    expect(await getLocalEntry(wsPath)).toBeUndefined();
    expect(await getNoteAsString(wsPath)).toBeUndefined();
    expect(await existsInRemote(wsPath)).toBe(false);
  });

  test('a new note is created locally and in remote simultaneously, should cause conflict', async () => {
    const wsPath = `${wsName}:test-1.md`;

    await workspace.createNote(wsPath)(store.state, store.dispatch, store);

    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getBranchHead({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, githubToken, repoName: wsName },
      additions: [
        {
          path: 'test-1.md',
          base64Content: btoa('I am created parallely'),
        },
      ],
      deletions: [],
    });

    expect(
      ghSliceKey.getSliceStateAsserted(store.state).conflictedWsPaths,
    ).toHaveLength(0);

    await sleep(0);

    expect(await getNoteAsString(wsPath)).toEqual(
      `doc(heading("test-1"), paragraph("Hello world!"))`,
    );

    await sleep(0);

    await pullChanges();

    await waitForExpect(() => {
      expect(
        ghSliceKey.getSliceStateAsserted(store.state).conflictedWsPaths,
      ).toHaveLength(1);
    });

    // the local note stays as is
    expect(await getNoteAsString(wsPath)).toEqual(
      `doc(heading("test-1"), paragraph("Hello world!"))`,
    );
  });
});

describe('discard local changes', () => {
  test('new file that does not exist upstream is removed', async () => {
    const wsPath = `${wsName}:test-2.md`;

    await workspace.createNote(wsPath)(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsPath)).toEqual(
      `doc(heading("test-2"), paragraph("Hello world!"))`,
    );

    const modifiedText = `test-2 hello I am modified`;
    const doc = createPMNode([], modifiedText);

    await workspace.writeNote(wsPath, doc)(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsPath)).toEqual(
      `doc(paragraph("test-2 hello I am modified"))`,
    );

    await discardLocalChanges(wsName)(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsPath)).toEqual(undefined);
  });

  test('locally modified file is reverted', async () => {
    // Make a direct remote change outside the realm of our app
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getBranchHead({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, githubToken, repoName: wsName },
      additions: [
        {
          path: 'test-1.md',
          base64Content: btoa('I am test-1'),
        },
      ],
      deletions: [],
    });

    await pullChanges();

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1',
    );

    const doc = createPMNode([], 'I am modified');
    await workspace.writeNote(wsName + ':test-1.md', doc)(
      store.state,
      store.dispatch,
      store,
    );

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am modified',
    );

    await discardLocalChanges(wsName)(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1',
    );
  });

  test('deleted file locally is placed back', async () => {
    // Make a direct remote change outside the realm of our app
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getBranchHead({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, githubToken, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, githubToken, repoName: wsName },
      additions: [
        {
          path: 'test-1.md',
          base64Content: btoa('I am test-1'),
        },
      ],
      deletions: [],
    });

    await pullChanges();

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1',
    );

    await workspace.deleteNote(wsName + ':test-1.md')(
      store.state,
      store.dispatch,
      store,
    );

    expect(await getNoteAsString(wsName + ':test-1.md')).toBe(undefined);

    await discardLocalChanges(wsName)(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1',
    );
  });
});
