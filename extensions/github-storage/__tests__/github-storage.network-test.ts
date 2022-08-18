import waitForExpect from 'wait-for-expect';

import type { BangleApplicationStore } from '@bangle.io/api';
import { notification, workspace } from '@bangle.io/api';
import { createBasicTestStore, createPMNode } from '@bangle.io/test-utils';
import { randomStr, sleep } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import * as github from '../github-api-helpers';
import type { GithubWsMetadata } from '../helpers';
import { getDatabase } from '../helpers';
import GithubStorageExt from '../index';
import { discardLocalChanges, syncWithGithub } from '../operations';

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

let githubWsMetadata: GithubWsMetadata;
let defaultNoteWsPath: string;
let wsName: string, store: BangleApplicationStore;
let abortController = new AbortController();
let getTree = github.getRepoTree();
const getLocalEntry = async (wsPath: string) => {
  let entries = await localFileEntryManager(
    getDatabase(store.state),
  ).getAllEntries('');

  return entries.find((e) => e.uid === wsPath);
};
const existsInRemote = async (wsPath: string) => {
  const tree = await getTree({
    config: { ...githubWsMetadata, repoName: wsName },
    wsName,
    abortSignal: abortController.signal,
  });

  return tree.tree.has(wsPath);
};

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
});

const getNoteAsString = async (wsPath: string): Promise<string | undefined> => {
  return (
    await workspace.getNote(wsPath)(store.state, store.dispatch, store)
  )?.toString();
};

const pullChanges = async () => {
  notification.clearAllNotifications()(store.state, store.dispatch);
  let result = await syncWithGithub(
    wsName,
    abortController.signal,
    localFileEntryManager(getDatabase(store.state)),
  )(store.state, store.dispatch, store);

  if (result === 'merge-conflict') {
    throw new Error('Encountered conflicts');
  }

  if (!result) {
    throw new Error('Unexpected state of sync');
  }

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

      expect(
        await localFileEntryManager(getDatabase(store.state)).getAllEntries(''),
      ).toEqual([
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
        config: { ...githubWsMetadata, repoName: wsName },
      });
      const tree = await getTree({
        config: { ...githubWsMetadata, repoName: wsName },
        wsName,
        abortSignal: abortController.signal,
      });

      expect(sha).toEqual(tree.sha);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: sha,
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, repoName: wsName },
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

      expect(
        await localFileEntryManager(getDatabase(store.state)).getAllEntries(''),
      ).toEqual([
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

      expect(
        (
          await localFileEntryManager(getDatabase(store.state)).getAllEntries(
            '',
          )
        )[0]?.isModified,
      ).toBe(false);
    });

    test('variety of remote changes: deleted and another is modified', async () => {
      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, repoName: wsName },
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
      ).toMatchInlineSnapshot(`"doc(paragraph(\\"I am test-1\\"))"`);
      expect(
        await getNoteAsString(wsName + ':test-2.md'),
      ).toMatchInlineSnapshot(`"doc(paragraph(\\"I am test-2\\"))"`);

      // // Make a direct remote change: delete test-1 and modify the other
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 2' },
        config: { ...githubWsMetadata, repoName: wsName },
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
      ).toMatchInlineSnapshot(
        `"doc(paragraph(\\"I am test-2 but modified\\"))"`,
      );

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
        config: { ...githubWsMetadata, repoName: wsName },
      });

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: sha,
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, repoName: wsName },
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
      expect(await getLocalEntry(defaultNoteWsPath)).toBeUndefined();
    });
  });

  describe('T4: remote unchanged, local modified', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await sleep(0);

      const modifiedText = `hello I am modified`;
      await workspace.writeNote(
        defaultNoteWsPath,
        createPMNode([], modifiedText),
      )(store.state, store.dispatch, store);

      expect(await getNoteAsString(defaultNoteWsPath)).toContain(modifiedText);

      expect((await getLocalEntry(defaultNoteWsPath))?.isModified).toBe(true);
      expect((await getLocalEntry(defaultNoteWsPath))?.isUntouched).toBe(false);

      expect(
        await localFileEntryManager(getDatabase(store.state)).getAllEntries(''),
      ).toEqual([
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
      await sleep(0);

      expect((await getLocalEntry(defaultNoteWsPath))?.isModified).toBe(false);
      expect((await getLocalEntry(defaultNoteWsPath))?.isUntouched).toBe(true);
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
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, repoName: wsName },
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
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, repoName: wsName },
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

      await expect(pullChanges()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Encountered conflicts"`,
      );

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
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 1' },
        config: { ...githubWsMetadata, repoName: wsName },
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

      await sleep(0);

      // locally modify test-2 note
      const modifiedText = `test-2 hello I am modified`;

      await workspace.writeNote(test2WsPath, createPMNode([], modifiedText))(
        store.state,
        store.dispatch,
        store,
      );

      expect(await getNoteAsString(test2WsPath)).toContain(modifiedText);
      expect((await getLocalEntry(test2WsPath))?.isUntouched).toBe(false);

      // external change: delete test-2
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getBranchHead({
          abortSignal: abortController.signal,
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update 2' },
        config: { ...githubWsMetadata, repoName: wsName },
        additions: [],
        deletions: [
          {
            path: 'test-2.md',
          },
        ],
      });

      await sleep(0);
      expect(await existsInRemote(test2WsPath)).toBe(false);

      await pullChanges();
      expect(await existsInRemote(test2WsPath)).toBe(true);

      expect(await getNoteAsString(test2WsPath)).toContain(modifiedText);

      expect((await getLocalEntry(test2WsPath))?.isUntouched).toBe(true);
      expect((await getLocalEntry(test2WsPath))?.isDeleted).toBe(false);
    });
  });

  describe('T7: local deleted, remote unchanged', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await sleep(0);

      await workspace.deleteNote(defaultNoteWsPath)(
        store.state,
        store.dispatch,
        store,
      );

      expect(await existsInRemote(defaultNoteWsPath)).toBe(true);
      // local entry should be soft deleted until the sync
      expect((await getLocalEntry(defaultNoteWsPath))?.isDeleted).toBe(true);

      await pullChanges();
      await sleep(0);
      expect(await existsInRemote(defaultNoteWsPath)).toBe(false);
      // local entry should be removed completely after syncing up the changes
      expect(await getLocalEntry(defaultNoteWsPath)).toBeUndefined();
    });
  });

  describe('T8: local is deleted, remote is modified', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await sleep(0);

      await workspace.deleteNote(defaultNoteWsPath)(
        store.state,
        store.dispatch,
        store,
      );
      // local entry should be soft deleted
      expect((await getLocalEntry(defaultNoteWsPath))?.isDeleted).toBe(true);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getLatestCommitSha({
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, repoName: wsName },
        additions: [
          {
            path: 'welcome-to-bangle.md',
            base64Content: btoa('I am changed content'),
          },
        ],
        deletions: [],
      });

      await pullChanges();
      await sleep(0);

      expect(await existsInRemote(defaultNoteWsPath)).toBe(true);
      // local entry's soft delete should be reverted
      expect((await getLocalEntry(defaultNoteWsPath))?.isDeleted).toBe(false);
      expect((await getLocalEntry(defaultNoteWsPath))?.isUntouched).toBe(true);

      expect(await getNoteAsString(defaultNoteWsPath)).toContain(
        'I am changed content',
      );
    });
  });

  describe('T9: local is deleted, remote is deleted', () => {
    test('basic', async () => {
      workspace.pushWsPath(defaultNoteWsPath)(store.state, store.dispatch);

      await sleep(0);

      await workspace.deleteNote(defaultNoteWsPath)(
        store.state,
        store.dispatch,
        store,
      );
      // local entry should be soft deleted
      expect((await getLocalEntry(defaultNoteWsPath))?.isDeleted).toBe(true);

      // Make a direct remote change outside the realm of our app
      await github.pushChanges({
        abortSignal: abortController.signal,
        headSha: await github.getLatestCommitSha({
          config: { ...githubWsMetadata, repoName: wsName },
        }),
        commitMessage: { headline: 'Test: external update' },
        config: { ...githubWsMetadata, repoName: wsName },
        additions: [],
        deletions: [{ path: 'welcome-to-bangle.md' }],
      });

      await pullChanges();
      await sleep(0);

      expect(await existsInRemote(defaultNoteWsPath)).toBe(false);
      expect(await getLocalEntry(defaultNoteWsPath)).toBeUndefined();
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

    expect((await getLocalEntry(wsPath))?.isNew).toBe(true);

    await workspace.deleteNote(wsPath)(store.state, store.dispatch, store);

    await sleep(0);

    expect((await getLocalEntry(wsPath))?.isNew).toBe(true);
    expect((await getLocalEntry(wsPath))?.isDeleted).toBe(true);

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
        config: { ...githubWsMetadata, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, repoName: wsName },
      additions: [
        {
          path: 'test-1.md',
          base64Content: btoa('I am created parallely'),
        },
      ],
      deletions: [],
    });

    await sleep(0);

    expect(await getNoteAsString(wsPath)).toEqual(
      `doc(heading("test-1"), paragraph("Hello world!"))`,
    );

    await sleep(0);
    await expect(pullChanges()).rejects.toThrowError('Encountered conflicts');

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

    await discardLocalChanges(
      wsName,
      localFileEntryManager(getDatabase(store.state)),
    )(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsPath)).toEqual(undefined);
  });

  test('locally modified file is reverted', async () => {
    // Make a direct remote change outside the realm of our app
    await github.pushChanges({
      abortSignal: abortController.signal,
      headSha: await github.getBranchHead({
        abortSignal: abortController.signal,
        config: { ...githubWsMetadata, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, repoName: wsName },
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

    await discardLocalChanges(
      wsName,
      localFileEntryManager(getDatabase(store.state)),
    )(store.state, store.dispatch, store);

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
        config: { ...githubWsMetadata, repoName: wsName },
      }),
      commitMessage: { headline: 'Test: external update 1' },
      config: { ...githubWsMetadata, repoName: wsName },
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

    await discardLocalChanges(
      wsName,
      localFileEntryManager(getDatabase(store.state)),
    )(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1',
    );
  });
});
