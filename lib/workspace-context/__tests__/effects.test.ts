import { sleep } from '@bangle.dev/utils';

import { getPageLocation, saveToHistoryState } from '@bangle.io/page-context';
import { getWorkspaceInfo, WorkspaceType } from '@bangle.io/workspaces';

import { wsNameToPathname } from '../helpers';
import { saveLastWorkspaceUsed } from '../last-seen-ws-name';
import {
  historyOnInvalidPath,
  refreshWsPaths,
  updateLocation,
} from '../operations';
import { createStore, getActionNamesDispatched } from './test-utils';

jest.mock('../operations', () => {
  const ops = jest.requireActual('../operations');
  return {
    ...ops,
    refreshWsPaths: jest.fn(),
    historyOnInvalidPath: jest.fn(),
    updateLocation: jest.fn(),
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
    getWorkspaceInfo: jest.fn(),
  };
});

const refreshWsPathsMock = refreshWsPaths as jest.MockedFunction<
  typeof refreshWsPaths
>;
const historyOnInvalidPathMock = historyOnInvalidPath as jest.MockedFunction<
  typeof historyOnInvalidPath
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
const updateLocationMock = updateLocation as jest.MockedFunction<
  typeof updateLocation
>;

beforeEach(() => {
  refreshWsPathsMock.mockImplementation(() => () => true);
  updateLocationMock.mockImplementation(() => () => true);
  historyOnInvalidPathMock.mockImplementation(() => () => {});
  saveToHistoryStateMock.mockImplementation(() => () => {});
  getWorkspaceInfoMock.mockImplementation(async () => ({
    name: 'test-ws',
    type: WorkspaceType.browser,
    metadata: {},
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
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: wsNameToPathname('test-ws'),
        locationSearchQuery: '',
      },
    });

    await sleep(0);

    expect(refreshWsPathsMock).toBeCalledTimes(2);

    store.dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: wsNameToPathname('test-ws-2'),
        locationSearchQuery: '',
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // changing query should not call refresh
    store.dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: wsNameToPathname('test-ws-2'),
        locationSearchQuery: 'change',
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // setting to undefined should not call refresh
    store.dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: undefined,
        locationSearchQuery: undefined,
      },
    });
    expect(refreshWsPathsMock).toBeCalledTimes(3);
  });
});

describe('validateLocationEffect', () => {
  test('works', async () => {
    const { store } = createStore();

    // send any action to triggerd the deferred hook
    store.dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: wsNameToPathname('test-ws/my-path'),
        locationSearchQuery: '',
      },
    });

    await sleep(0);

    expect(historyOnInvalidPathMock).toBeCalledTimes(1);
    expect(historyOnInvalidPathMock).nthCalledWith(
      1,
      'test-ws',
      'test-ws:my-path',
    );
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

    expect(updateLocation).toBeCalledTimes(1);
    expect(updateLocation).nthCalledWith(1, location1);
  });
});

describe('saveWorkspaceInfoEffect', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: wsNameToPathname('test-ws'),
        locationSearchQuery: '',
      },
    });

    expect(getWorkspaceInfo).toHaveBeenCalledTimes(1);
    expect(getWorkspaceInfo).nthCalledWith(1, 'test-ws');

    await sleep(0);

    expect(saveToHistoryState).toBeCalledTimes(1);
    expect(saveToHistoryState).nthCalledWith(1, 'workspaceInfo', {
      metadata: {},
      name: 'test-ws',
      type: 'browser',
    });

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-location',
    ]);

    // an other action doesn't trigger the hook
    store.dispatch({
      name: 'action::workspace-context:update-recently-used-ws-paths',
      value: {
        wsName: 'test-ws',
        recentlyUsedWsPaths: ['hello:world.md'],
      },
    });

    expect(getWorkspaceInfo).toHaveBeenCalledTimes(1);
  });
});

describe('saveLastUsedWorkspace', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::workspace-context:update-location',
      value: {
        locationPathname: wsNameToPathname('test-ws'),
        locationSearchQuery: '',
      },
    });

    await sleep(0);

    expect(saveLastWorkspaceUsed).toBeCalledTimes(1);
    expect(saveLastWorkspaceUsed).nthCalledWith(1, 'test-ws');
  });
});
