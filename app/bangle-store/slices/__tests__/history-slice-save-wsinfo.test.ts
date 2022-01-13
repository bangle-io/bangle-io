import { BrowserHistory } from '@bangle.io/history';
import { pageSlice, PageSliceAction } from '@bangle.io/slice-page';
import {
  WorkspaceInfo,
  workspacesSliceInitialState,
  workspacesSliceKey,
  WorkspaceType,
} from '@bangle.io/slice-workspaces-manager';
import { createTestStore } from '@bangle.io/test-utils/create-test-store';
import { sleep } from '@bangle.io/utils';

import { historySlice, historySliceKey } from '../history-slice';

jest.mock('@bangle.io/slice-workspaces-manager', () => {
  const other = jest.requireActual('@bangle.io/slice-workspaces-manager');
  const workspacesSliceKey = other.workspacesSliceKey;
  workspacesSliceKey.getSliceStateAsserted = jest.fn();
  return {
    ...other,
    workspacesSliceKey,
  };
});

const createWsInfo = (obj: Partial<WorkspaceInfo>): WorkspaceInfo => {
  return {
    name: 'test-ws-info',
    type: WorkspaceType['browser'],
    lastModified: 0,
    metadata: {},
    ...obj,
  };
};

const workspacesSliceStateMock = workspacesSliceKey[
  'getSliceStateAsserted'
] as jest.MockedFunction<typeof workspacesSliceKey['getSliceStateAsserted']>;

let store, history;

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  ({ store } = createTestStore<PageSliceAction>([pageSlice(), historySlice()]));

  ({ history } = historySliceKey.getSliceStateAsserted(store.state));

  jest
    .spyOn(history as BrowserHistory, 'updateHistoryState')
    .mockImplementation(() => {});
});

describe('saveWorkspaceInfoEffect', () => {
  test('works when not a nativefs workspace', async () => {
    workspacesSliceStateMock.mockImplementation(() => ({
      ...workspacesSliceInitialState,
      workspaceInfos: { testWs: createWsInfo({ name: 'testWs' }) },
    }));

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [] },
    );
  });

  test('works when a nativefs workspace', async () => {
    workspacesSliceStateMock.mockImplementation(() => ({
      ...workspacesSliceInitialState,
      workspaceInfos: {
        testWs: createWsInfo({
          name: 'testWs',
          type: WorkspaceType.nativefs,
          metadata: { rootDirHandle: { root: 'handler' } },
        }),
      },
    }));

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [{ root: 'handler' }] },
    );
  });

  test('ignores when a workspace is deleted', async () => {
    workspacesSliceStateMock.mockImplementation(() => ({
      ...workspacesSliceInitialState,
      workspaceInfos: {
        testWs: createWsInfo({
          name: 'testWs',
          type: WorkspaceType.nativefs,
          deleted: true,
          metadata: { rootDirHandle: { root: 'handler' } },
        }),
      },
    }));

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [] },
    );
  });

  test('dispatching multipe times does not call it again', async () => {
    const wsInfo = createWsInfo({
      name: 'testWs',
      type: WorkspaceType.nativefs,
      metadata: { rootDirHandle: { root: 'handler' } },
    });

    const wsInfos = {
      testWs: wsInfo,
    };

    workspacesSliceStateMock.mockImplementation(() => ({
      ...workspacesSliceInitialState,
      workspaceInfos: wsInfos,
    }));

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);

    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
    expect((history as BrowserHistory).updateHistoryState).nthCalledWith(
      1,

      { workspacesRootDir: [wsInfo.metadata.rootDirHandle] },
    );

    workspacesSliceStateMock.mockImplementation(() => ({
      ...workspacesSliceInitialState,
      workspaceInfos: wsInfos,
    }));

    store.dispatch({ name: 'action::some-action' } as any);

    await sleep(0);
    expect((history as BrowserHistory).updateHistoryState).toBeCalledTimes(1);
  });
});
