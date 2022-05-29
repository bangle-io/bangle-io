import waitForExpect from 'wait-for-expect';

import {
  BangleApplicationStore,
  notification,
  workspace,
} from '@bangle.io/api';
import { createBasicTestStore, createPMNode } from '@bangle.io/test-utils';
import { randomStr, sleep } from '@bangle.io/utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import * as github from '../github-api-helpers';
import { GithubWsMetadata } from '../helpers';
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

const pullChanges = async () => {
  notification.clearAllNotifications()(store.state, store.dispatch);
  await syncWithGithub(wsName, abortController.signal, localFileEntryManager)(
    store.state,
    store.dispatch,
    store,
  );
};

describe('pull changes', () => {
  test('if remote note changes, its updates are applied correctly', async () => {
    // this note is automatically created when setting up the workspace
    let note = await getNoteAsString(defaultNoteWsPath);
    expect(note?.toString()).toContain('Welcome to Bangle.io');

    expect(await localFileEntryManager.getAllEntries()).toEqual([
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
    expect(note?.toString()).toEqual('doc(paragraph("I am changed content"))');

    expect(await localFileEntryManager.getAllEntries()).toEqual([
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

    expect((await localFileEntryManager.getAllEntries())?.[0]?.isModified).toBe(
      false,
    );
  });

  test('if last remote note is deleted and repo becomes empty', async () => {
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
    expect(await getNoteAsString(wsName + ':test-1.md')).toMatchInlineSnapshot(
      `"doc(paragraph(\\"I am test-1\\"))"`,
    );
    expect(await getNoteAsString(wsName + ':test-2.md')).toMatchInlineSnapshot(
      `"doc(paragraph(\\"I am test-2\\"))"`,
    );

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
    expect(await getNoteAsString(wsName + ':test-2.md')).toMatchInlineSnapshot(
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

  test('a note which was locally modified should not be updated when pulling changes', async () => {
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
      `"Conflicts not yet supported. 1 conflicts detected"`,
    );

    // only test-1 file's content should be updated
    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1 updated remotely',
    );

    // note 2 should not be updated as it was locally modified
    // FYI: this is a merge conflict situation
    expect(await getNoteAsString(wsName + ':test-2.md')).toContain(
      modifiedText,
    );
  });

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

    await pullChanges();

    // create a local entry of note, it is needed for updating this note
    await getNoteAsString(wsName + ':test-2.md');

    // locally modify test-2 note
    const modifiedText = `test-2 hello I am modified`;
    await workspace.writeNote(
      `${wsName}:test-2.md`,
      createPMNode([], modifiedText),
    )(store.state, store.dispatch, store);

    expect(await getNoteAsString(wsName + ':test-2.md')).toContain(
      modifiedText,
    );

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

    await pullChanges();

    expect(await getNoteAsString(wsName + ':test-2.md')).toContain(
      modifiedText,
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

    await discardLocalChanges(wsName, localFileEntryManager)(
      store.state,
      store.dispatch,
      store,
    );

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

    await discardLocalChanges(wsName, localFileEntryManager)(
      store.state,
      store.dispatch,
      store,
    );

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

    await discardLocalChanges(wsName, localFileEntryManager)(
      store.state,
      store.dispatch,
      store,
    );

    expect(await getNoteAsString(wsName + ':test-1.md')).toContain(
      'I am test-1',
    );
  });
});
