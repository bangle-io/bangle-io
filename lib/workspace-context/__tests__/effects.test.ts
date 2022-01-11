import { sleep } from '@bangle.dev/utils';

import { getPageLocation, saveToHistoryState } from '@bangle.io/page-context';
import type { ReturnReturnType, UnPromisify } from '@bangle.io/shared-types';
import {
  getWorkspaceInfo,
  WorkspaceInfo,
  WorkspaceType,
} from '@bangle.io/workspaces';
import { OpenedWsPaths, wsNameToPathname } from '@bangle.io/ws-path';

import { saveLastWorkspaceUsed } from '../last-seen-ws-name';
import {
  goToInvalidPathRoute,
  refreshWsPaths,
  syncPageLocation,
} from '../operations';
import { createStore, getActionNamesDispatched } from './test-utils';

jest.mock('../operations', () => {
  const ops = jest.requireActual('../operations');
  return {
    ...ops,
    refreshWsPaths: jest.fn(),
    goToInvalidPathRoute: jest.fn(),
    syncPageLocation: jest.fn(),
  };
});
jest.mock('../last-seen-ws-name', () => {
  const ops = jest.requireActual('../last-seen-ws-name');
  return {
    ...ops,
    saveLastWorkspaceUsed: jest.fn(),
  };
});

jest.mock('@bangle.io/page-context', () => {
  const ops = jest.requireActual('@bangle.io/page-context');
  return {
    ...ops,
    getPageLocation: jest.fn(),
    saveToHistoryState: jest.fn(),
  };
});

jest.mock('@bangle.io/workspaces', () => {
  const ops = jest.requireActual('@bangle.io/workspaces');

  return {
    ...ops,
    getWorkspaceInfo: jest.fn(() => () => {}),
  };
});

const refreshWsPathsMock = refreshWsPaths as jest.MockedFunction<
  typeof refreshWsPaths
>;
const goToInvalidPathRouteMock = goToInvalidPathRoute as jest.MockedFunction<
  typeof goToInvalidPathRoute
>;
const getWorkspaceInfoMock = getWorkspaceInfo as jest.MockedFunction<
  typeof getWorkspaceInfo
>;
const saveToHistoryStateMock = saveToHistoryState as jest.MockedFunction<
  typeof saveToHistoryState
>;
const getPageLocationMock = getPageLocation as jest.MockedFunction<
  typeof getPageLocation
>;
const updateLocationMock = syncPageLocation as jest.MockedFunction<
  typeof syncPageLocation
>;

beforeEach(() => {
  refreshWsPathsMock.mockImplementation(() => () => true);
  updateLocationMock.mockImplementation(() => () => true);
  goToInvalidPathRouteMock.mockImplementation(() => () => {});
  saveToHistoryStateMock.mockImplementation(() => () => {});
  getWorkspaceInfoMock.mockImplementation(() => async () => ({
    name: 'test-ws',
    type: WorkspaceType.browser,
    metadata: {},
    lastModified: 1,
  }));

  const location = {
    search: '',
    pathname: '',
  };
  getPageLocationMock.mockImplementation(() => () => location);
});

describe('refreshWsPathsEffect', () => {
  test('deferredUpdate: calls refresh in deferred update', async () => {
    const { store } = createStore();

    // send any action to triggerd the deferred hook
    store.dispatch({ name: 'some-action' } as any);

    await sleep(0);

    expect(refreshWsPathsMock).toBeCalledTimes(1);

    // subsequent calls should not trigger refresh
    store.dispatch({ name: 'some-action' } as any);
    store.dispatch({ name: 'some-action' } as any);

    await sleep(0);

    expect(refreshWsPaths).toBeCalledTimes(1);
  });

  test('deferredUpdate: does not refresh if wsPaths exist', async () => {
    const { store } = createStore({
      wsPaths: [],
    });

    // send any action to triggerd the deferred hook
    store.dispatch({ name: 'some-action' } as any);

    await sleep(0);

    expect(refreshWsPathsMock).toBeCalledTimes(0);
  });

  test('update: calls refresh on wsName change', async () => {
    const { store } = createStore({});

    // trigger the deferred side-effect so that it gets out of our way
    store.dispatch({ name: 'some-action' } as any);
    await sleep(0);
    expect(refreshWsPathsMock).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    await sleep(0);

    expect(refreshWsPathsMock).toBeCalledTimes(2);

    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws-2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // changing openedWsPaths should not call refresh
    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws-2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // setting to undefined should not call refresh
    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: undefined,
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    expect(refreshWsPathsMock).toBeCalledTimes(3);
  });
});

describe('updateLocationEffect', () => {
  test('works', async () => {
    const location1 = {
      search: '',
      pathname: wsNameToPathname('test-ws'),
    };

    const location2 = {
      search: '',
      pathname: wsNameToPathname('test-ws-2'),
    };

    getPageLocationMock
      .mockImplementationOnce(() => () => location1)
      .mockImplementationOnce(() => () => location2);

    const { store } = createStore();

    store.dispatch({
      name: 'action::some-action',
    } as any);

    expect(syncPageLocation).toBeCalledTimes(1);
    expect(syncPageLocation).nthCalledWith(1, location1);
  });
});

describe('saveWorkspaceInfoEffect', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    expect(getWorkspaceInfo).toHaveBeenCalledTimes(1);
    expect(getWorkspaceInfo).nthCalledWith(1, 'test-ws');

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspaceInfo', {
      metadata: {},
      name: 'test-ws',
      type: 'browser',
      lastModified: 1,
    });

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::@bangle.io/workspace-context:sync-page-location',
    ]);

    // an other action doesn't trigger the hook
    store.dispatch({
      name: 'action::@bangle.io/workspace-context:update-recently-used-ws-paths',
      value: {
        wsName: 'test-ws',
        recentlyUsedWsPaths: ['hello:world.md'],
      },
    });

    expect(getWorkspaceInfo).toHaveBeenCalledTimes(1);
  });

  test('destroying should not dispatch action', async () => {
    let res;
    getWorkspaceInfoMock.mockImplementation(
      () => () =>
        new Promise((_res) => {
          res = _res;
        }),
    );
    const { store } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    expect(getWorkspaceInfo).toHaveBeenCalledTimes(1);
    store.destroy();

    res();
    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(0);
  });

  test('check the current wsName before dispatching action', async () => {
    let res: Array<
      (cb: UnPromisify<ReturnReturnType<typeof getWorkspaceInfoMock>>) => void
    > = [];

    getWorkspaceInfoMock.mockImplementation(
      () => () =>
        new Promise((_res) => {
          res.push(_res);
        }),
    );
    const { store } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    expect(getWorkspaceInfoMock).toBeCalledTimes(1);
    expect(getWorkspaceInfoMock).nthCalledWith(1, 'test-ws');

    // change the wsName while the request is to get info is in flight
    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    expect(getWorkspaceInfoMock).nthCalledWith(2, 'test-ws2');

    const firstResponse: WorkspaceInfo = {
      name: 'test-ws',
      type: WorkspaceType.browser,
      metadata: {},
      lastModified: 3,
    };
    const secondResponse: WorkspaceInfo = {
      name: 'test-ws2',
      type: WorkspaceType.browser,
      metadata: {},
      lastModified: 3,
    };
    res[0]!(firstResponse);
    res[1]!(secondResponse);
    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    // should only dispatch for the current wsName
    expect(saveToHistoryState).nthCalledWith(
      1,
      'workspaceInfo',
      secondResponse,
    );
  });
});

describe('saveLastUsedWorkspace', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/workspace-context:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    await sleep(0);

    expect(saveLastWorkspaceUsed).toBeCalledTimes(1);
    expect(saveLastWorkspaceUsed).nthCalledWith(1, 'test-ws');
  });
});
