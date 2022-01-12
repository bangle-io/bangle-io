// Need to disable sort to make the mocking run first.
// eslint-disable-next-line simple-import-sort/imports
import mockBabyFs from '@bangle.io/test-utils/baby-fs-test-mock';

import { saveToHistoryState } from '@bangle.io/page-context';
import { sleep } from '@bangle.io/utils';
import { createStore, createWsInfo } from './test-utils';
import { WorkspaceType } from '..';

jest.mock('@bangle.io/page-context', () => {
  const ops = jest.requireActual('@bangle.io/page-context');
  return {
    ...ops,
    saveToHistoryState: jest.fn(() => () => {}),
  };
});

const saveToHistoryStateMock = saveToHistoryState as jest.MockedFunction<
  typeof saveToHistoryState
>;

beforeEach(() => {
  mockBabyFs.mockStore.clear();
  saveToHistoryStateMock.mockImplementation(() => () => {});
});

describe('saveWorkspaceInfoEffect', () => {
  test('works when not a nativefs workspace', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({ name: 'testWs' }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', []);
  });
  test('works when a nativefs workspace', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', [
      { root: 'handler' },
    ]);
  });

  test('destroying should not dispatch action', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);

    store.destroy();
    await sleep(0);
    expect(saveToHistoryState).toBeCalledTimes(1);
  });

  test('dispatching multipe times does not call it again', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', [
      { root: 'handler' },
    ]);

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });
    expect(saveToHistoryState).toBeCalledTimes(1);
  });

  test('does not save destroyed workspaces', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspaces:set-workspace-infos',
      value: {
        workspaceInfos: {
          testWs: createWsInfo({
            name: 'testWs',
            deleted: true,
            type: WorkspaceType.nativefs,
            metadata: { rootDirHandle: { root: 'handler' } },
          }),
        },
      },
    });

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspacesRootDir', []);
  });
});
