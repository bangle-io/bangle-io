import { sleep } from '@bangle.dev/utils';

import { WorkspaceType } from '@bangle.io/constants';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { refreshWsPaths } from '../file-operations';
import { goToInvalidPathRoute } from '../operations';
import { getWorkspaceInfo } from '../workspaces-operations';
import { createStore, getActionNamesDispatched } from './test-utils';

jest.mock('../operations', () => {
  const ops = jest.requireActual('../operations');
  return {
    ...ops,
    goToInvalidPathRoute: jest.fn(),
  };
});
jest.mock('../file-operations', () => {
  const ops = jest.requireActual('../operations');
  return {
    ...ops,
    refreshWsPaths: jest.fn(),
  };
});

jest.mock('@bangle.io/slice-page', () => {
  const ops = jest.requireActual('@bangle.io/slice-page');
  return {
    ...ops,
    getPageLocation: jest.fn(() => () => {}),
  };
});

jest.mock('../workspaces-operations', () => {
  const ops = jest.requireActual('../workspaces-operations');

  return {
    ...ops,
    getWorkspaceInfo: jest.fn(() => () => {}),
  };
});

const refreshWsPathsMock = jest
  .mocked(refreshWsPaths)
  .mockImplementation(() => async () => true);

jest.mocked(goToInvalidPathRoute).mockImplementation(() => () => {});

jest.mocked(getWorkspaceInfo).mockImplementation(() => async () => ({
  name: 'test-ws',
  type: WorkspaceType.browser,
  metadata: {},
  lastModified: 1,
}));

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
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    await sleep(0);

    expect(refreshWsPathsMock).toBeCalledTimes(2);

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws-2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // changing openedWsPaths should not call refresh
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws-2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });

    expect(refreshWsPathsMock).toBeCalledTimes(3);

    // setting to undefined should not call refresh
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: undefined,
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    expect(refreshWsPathsMock).toBeCalledTimes(3);
  });
});

describe('saveWorkspaceInfoEffect', () => {
  test('works', async () => {
    const { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    expect(getActionNamesDispatched(dispatchSpy)).toContain(
      'action::@bangle.io/slice-workspace:set-opened-workspace',
    );

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
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
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
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);

    // change the wsName while the request is to get info is in flight
    store.dispatch({
      name: 'action::@bangle.io/slice-workspace:set-opened-workspace',
      value: {
        wsName: 'test-ws2',
        openedWsPaths: OpenedWsPaths.createEmpty(),
      },
    });
    await sleep(0);
  });
});
