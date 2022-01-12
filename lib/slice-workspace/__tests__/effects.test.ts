import { sleep } from '@bangle.dev/utils';

import type { ReturnReturnType, UnPromisify } from '@bangle.io/shared-types';
import { getPageLocation } from '@bangle.io/slice-page';
import {
  getWorkspaceInfo,
  WorkspaceInfo,
  WorkspaceType,
} from '@bangle.io/slice-workspaces-manager';
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

jest.mock('@bangle.io/slice-page', () => {
  const ops = jest.requireActual('@bangle.io/slice-page');
  return {
    ...ops,
    getPageLocation: jest.fn(),
  };
});

jest.mock('@bangle.io/slice-workspaces-manager', () => {
  const ops = jest.requireActual('@bangle.io/slice-workspaces-manager');

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
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    await sleep(0);

    expect(refreshWsPathsMock).toBeCalledTimes(2);

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws-2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // changing openedWsPaths should not call refresh
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws-2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // setting to undefined should not call refresh
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
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
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::@bangle.io/slice-workspace:sync-page-location',
    ]);

    // an other action doesn't trigger the hook
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:update-recently-used-ws-paths',
      value: {
        wsName: 'test-ws',
        recentlyUsedWsPaths: ['hello:world.md'],
      },
    });
  });

  test('destroying should not dispatch action', async () => {
    const { store } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    store.destroy();

    await sleep(0);
  });

  test('check the current wsName before dispatching action', async () => {
    const { store } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    // change the wsName while the request is to get info is in flight
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
      value: {
        wsName: 'test-ws2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);
  });
});

describe('saveLastUsedWorkspace', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:sync-page-location',
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
