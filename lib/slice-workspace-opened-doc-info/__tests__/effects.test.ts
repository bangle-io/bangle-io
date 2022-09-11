import { calculateGitFileSha } from '@bangle.io/git-file-sha';
import {
  getOpenedWsPaths,
  updateOpenedWsPaths,
  workspaceSliceKey,
} from '@bangle.io/slice-workspace';
import {
  createBasicTestStore,
  setupMockWorkspaceWithNotes,
  waitForExpect,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';

import { SYNC_ENTRIES, workspaceOpenedDocInfoKey } from '../common';
import { getOpenedDocInfo, updateDocInfo } from '../operations';
import { workspaceOpenedDocInfoSlice } from '../slice-workspace-opened-doc-info';

jest.mock('@bangle.io/constants', () => {
  const actual = jest.requireActual('@bangle.io/constants');

  return {
    ...actual,
    DISK_SHA_CHECK_INTERVAL: 2,
  };
});

const mdToSha = (md: string) => {
  return calculateGitFileSha(
    new File([new Blob([md], { type: 'text/plain' })], 'test.md'),
  );
};

const setup = async () => {
  const { store, ...helpers } = createBasicTestStore({
    slices: [workspaceOpenedDocInfoSlice()],
  });

  return {
    store: workspaceOpenedDocInfoKey.getStore(store),
    ...helpers,
  };
};

describe('syncWithOpenedWsPathsEffect', () => {
  test('sync with opened wsPaths', async () => {
    const { store, getAction } = await setup();

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      [`test-ws:one.md`, `# Hello World 0`],
      [`test-ws:two.md`, `# Hello World 1`],
    ]);

    workspaceSliceKey.callOp(
      store.state,
      store.dispatch,
      updateOpenedWsPaths((openedWsPath) => {
        return openedWsPath
          .updatePrimaryWsPath('test-ws:one.md')
          .updateSecondaryWsPath('test-ws:two.md');
      }),
    );

    await waitForExpect(() => {
      expect(
        workspaceOpenedDocInfoKey.getSliceState(store.state)?.openedFiles,
      ).toEqual({
        'test-ws:one.md': expect.objectContaining({
          pendingWrite: false,
          wsPath: 'test-ws:one.md',
        }),
        'test-ws:two.md': expect.objectContaining({
          pendingWrite: false,
          wsPath: 'test-ws:two.md',
        }),
      });
    });

    expect(getAction(SYNC_ENTRIES)).toEqual([
      // the first two are due to setup mock workspace creating one.md, then pushing it
      // to primary and then creating two.md, then pushing it to primary.
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries',
        value: {
          additions: ['test-ws:one.md'],
          removals: [],
        },
      },
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries',
        value: {
          additions: ['test-ws:two.md'],
          removals: ['test-ws:one.md'],
        },
      },

      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-workspace-opened-doc-info:sync-entries',
        value: {
          additions: ['test-ws:one.md'],
          removals: [],
        },
      },
    ]);

    // should not dispatch any other action if no changes

    store.dispatch({
      name: 'some-other-action',
      value: {},
    } as any);

    expect(getAction(SYNC_ENTRIES)).toHaveLength(3);
  });

  test('does not clear wsPaths which are no longer open but have pending writes', async () => {
    const { store } = await setup();

    await setupMockWorkspaceWithNotes(store, 'test-ws', [
      [`test-ws:one.md`, `# Hello World 0`],
      [`test-ws:two.md`, `# Hello World 1`],
    ]);

    workspaceSliceKey.callOp(
      store.state,
      store.dispatch,
      updateOpenedWsPaths((openedWsPath) => {
        return openedWsPath
          .updatePrimaryWsPath('test-ws:one.md')
          .updateSecondaryWsPath('test-ws:two.md');
      }),
    );

    await waitForExpect(() =>
      expect(
        workspaceSliceKey
          .callQueryOp(store.state, getOpenedWsPaths())
          .toArray()
          .filter(Boolean),
      ).toEqual(['test-ws:one.md', 'test-ws:two.md']),
    );

    await sleep(0);

    updateDocInfo('test-ws:two.md', {
      pendingWrite: true,
    })(store.state, store.dispatch);

    // close two
    workspaceSliceKey.callOp(
      store.state,
      store.dispatch,
      updateOpenedWsPaths((openedWsPath) => {
        return openedWsPath.closeIfFound('test-ws:two.md');
      }),
    );

    // should have removed two.md

    await waitForExpect(() =>
      expect(
        workspaceSliceKey
          .callQueryOp(store.state, getOpenedWsPaths())
          .toArray()
          .filter(Boolean),
      ).toEqual(['test-ws:one.md']),
    );

    await sleep(0);

    // should keep two around as it has pending write
    expect(getOpenedDocInfo()(store.state)).toEqual({
      'test-ws:one.md': expect.objectContaining({
        pendingWrite: false,
        wsPath: 'test-ws:one.md',
      }),
      'test-ws:two.md': expect.objectContaining({
        pendingWrite: true,
        wsPath: 'test-ws:two.md',
      }),
    });

    updateDocInfo('test-ws:two.md', {
      pendingWrite: false,
    })(store.state, store.dispatch);

    await sleep(0);

    // should remove it now since no more pending write
    expect(getOpenedDocInfo()(store.state)).toEqual({
      'test-ws:one.md': expect.objectContaining({
        pendingWrite: false,
        wsPath: 'test-ws:one.md',
      }),
    });
  });
});

describe('sha effects', () => {
  let wsName: string, wsPath1: string;

  beforeEach(() => {
    wsName = 'my-ws-' + Math.random();
    wsPath1 = `${wsName}:test-dir/magic.md`;
  });

  describe('calculateLastKnownDiskShaEffect', () => {
    test('should set sha', async () => {
      const { store } = await setup();

      await setupMockWorkspaceWithNotes(store, wsName, [
        [wsPath1, `# hello mars`],
      ]);

      const lastKnownDiskSha = await mdToSha('# hello mars');

      await waitForExpect(() => {
        const docInfo = getOpenedDocInfo()(store.state)[wsPath1];
        expect(docInfo).toMatchObject({
          wsPath: wsPath1,
          lastKnownDiskSha: lastKnownDiskSha,
        });
      });
    });
  });

  describe('calculateCurrentDiskShaEffect', () => {
    test('should set sha', async () => {
      const { store } = await setup();
      await setupMockWorkspaceWithNotes(store, wsName, [
        [wsPath1, `# hello mars`],
      ]);

      const currentDiskSha = await mdToSha('# hello mars');

      await waitForExpect(() => {
        const docInfo = getOpenedDocInfo()(store.state)[wsPath1];

        expect(docInfo).toMatchObject({
          wsPath: wsPath1,
          currentDiskSha: currentDiskSha,
        });
      });
    });
  });
});
