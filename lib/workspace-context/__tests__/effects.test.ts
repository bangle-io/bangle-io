import { sleep } from '@bangle.dev/utils';

import { wsNameToPathname } from '../helpers';
import { historyOnInvalidPath, refreshWsPaths } from '../operations';
import { createStore } from './test-utils';

jest.mock('../operations', () => {
  const ops = jest.requireActual('../operations');
  return {
    ...ops,
    refreshWsPaths: jest.fn(),
    historyOnInvalidPath: jest.fn(),
  };
});

const refreshWsPathsMock = refreshWsPaths as jest.MockedFunction<
  typeof refreshWsPaths
>;
const historyOnInvalidPathMock = historyOnInvalidPath as jest.MockedFunction<
  typeof historyOnInvalidPath
>;

beforeEach(() => {
  refreshWsPathsMock.mockImplementation(() => () => true);
  historyOnInvalidPathMock.mockImplementation(() => () => {});
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
