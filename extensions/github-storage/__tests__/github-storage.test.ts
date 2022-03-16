import waitForExpect from 'wait-for-expect';

import { ApplicationStore } from '@bangle.io/create-store';
import {
  clearAllNotifications,
  notificationSliceKey,
} from '@bangle.io/slice-notification';
import {
  createWorkspace,
  getNote,
  refreshWsPaths,
  workspaceSliceKey,
  writeNote,
} from '@bangle.io/slice-workspace';
import { createBasicTestStore, createPMNode } from '@bangle.io/test-utils';

import { GITHUB_STORAGE_PROVIDER_NAME } from '../common';
import { localFileEntryManager } from '../file-entry-manager';
import {
  createRepo,
  getLatestCommitSha,
  getTree,
  pushChanges,
} from '../github-api-helpers';
import { GithubWsMetadata } from '../helpers';
import GithubStorageExt from '../index';
import { pullGithubChanges } from '../operations';

let githubWsMetadata: GithubWsMetadata;

jest.setTimeout(300000);

beforeEach(() => {
  githubWsMetadata = {
    // eslint-disable-next-line no-process-env
    owner: process.env.GITHUB_OWNER as string,
    branch: 'main',
    // eslint-disable-next-line no-process-env
    githubToken: process.env.GITHUB_TOKEN as string,
  };
});

let wsName: string, store: ApplicationStore;

describe('pull changes', () => {
  beforeEach(async () => {
    wsName = 'bangle-test-' + Date.now();
    await createRepo({
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

    await createWorkspace(
      wsName,
      GITHUB_STORAGE_PROVIDER_NAME,
      githubWsMetadata,
    )(store.state, store.dispatch, store);

    await getNoteAsString(`welcome-to-bangle.md`);
  });

  const pullChanges = async () => {
    clearAllNotifications()(store.state, store.dispatch);
    await pullGithubChanges(localFileEntryManager)(
      store.state,
      store.dispatch,
      store,
    );
    // wait for success/failure notification
    await waitForExpect(() => {
      expect(
        notificationSliceKey.getSliceStateAsserted(store.state).notifications,
      ).toHaveLength(1);
    });
  };

  const getNoteAsString = async (
    fileName: string,
  ): Promise<string | undefined> => {
    return (
      await getNote(`${wsName}:${fileName}`)(store.state, store.dispatch, store)
    )?.toString();
  };

  test('if remote note changes, its updates are applied correctly', async () => {
    // this note is automatically created when setting up the workspace
    let note = await getNoteAsString(`welcome-to-bangle.md`);
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
        uid: `${wsName}:welcome-to-bangle.md`,
      },
    ]);

    // SHAs via these two APIs should always match as per Github API
    const sha = await getLatestCommitSha({
      config: { ...githubWsMetadata, repoName: wsName },
    });
    const tree = await getTree({
      config: { ...githubWsMetadata, repoName: wsName },
      wsName,
    });

    expect(sha).toEqual(tree.sha);

    // Make a direct remote change outside the realm of our app
    await pushChanges({
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
    note = await getNoteAsString(`welcome-to-bangle.md`);
    // note should still point to the old content
    // because we have not synced yet.
    expect(note?.toString()).toContain('Welcome to Bangle.io');

    await pullChanges();

    note = await getNoteAsString(`welcome-to-bangle.md`);

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
        uid: `${wsName}:welcome-to-bangle.md`,
      },
    ]);

    expect((await localFileEntryManager.getAllEntries())?.[0]?.isModified).toBe(
      false,
    );
  });

  test('if last remote note is deleted and repo becomes empty', async () => {
    const sha = await getLatestCommitSha({
      config: { ...githubWsMetadata, repoName: wsName },
    });

    // Make a direct remote change outside the realm of our app
    await pushChanges({
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
    let note = await getNoteAsString(`welcome-to-bangle.md`);
    // note should still point to the old content
    // because we have not synced yet.
    expect(note?.toString()).toContain('Welcome to Bangle.io');

    await pullChanges();

    note = await getNoteAsString(`welcome-to-bangle.md`);
    // note should now be deleted
    expect(note).toBeUndefined();
  });

  test('remote changes: deleted and another is modified', async () => {
    // Make a direct remote change outside the realm of our app
    await pushChanges({
      headSha: await getLatestCommitSha({
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

    // since we haven't pulled the changes yet, the note should still point to the old content
    // where test-X notes donot exist
    expect(await getNoteAsString('test-1.md')).toBeUndefined();
    expect(await getNoteAsString('test-2.md')).toBeUndefined();

    await pullChanges();

    expect(await getNoteAsString('test-1.md')).toMatchInlineSnapshot(
      `"doc(paragraph(\\"I am test-1\\"))"`,
    );
    expect(await getNoteAsString('test-2.md')).toMatchInlineSnapshot(
      `"doc(paragraph(\\"I am test-2\\"))"`,
    );

    // delete one and modify the other
    await pushChanges({
      headSha: await getLatestCommitSha({
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

    expect(await getNoteAsString('test-1.md')).toBeUndefined();
    expect(await getNoteAsString('test-2.md')).toMatchInlineSnapshot(
      `"doc(paragraph(\\"I am test-2 but modified\\"))"`,
    );

    refreshWsPaths()(store.state, store.dispatch);

    await waitForExpect(async () => {
      expect(
        await workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths,
      ).toEqual([`${wsName}:test-2.md`, `${wsName}:welcome-to-bangle.md`]);
    });
  });

  test('a note which was locally modified should not updated when pulling changes', async () => {
    // Make a direct remote change outside the realm of our app
    await pushChanges({
      headSha: await getLatestCommitSha({
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

    // get note to create a locally entry which is needed for writing
    await getNoteAsString('test-2.md');

    const modifiedText = `test-2 hello I am modified`;
    const docModified = createPMNode([], modifiedText);

    await writeNote(`${wsName}:test-2.md`, docModified)(
      store.state,
      store.dispatch,
      store,
    );

    expect(await getNoteAsString('test-2.md')).toContain(modifiedText);

    await pullChanges();

    expect(await getNoteAsString('test-2.md')).toContain(modifiedText);

    await pushChanges({
      headSha: await getLatestCommitSha({
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

    await pullChanges();

    // only test-1 file's content should be updated
    expect(await getNoteAsString('test-1.md')).toContain(
      'I am test-1 updated remotely',
    );

    expect(await getNoteAsString('test-2.md')).toContain(modifiedText);
  });
});
