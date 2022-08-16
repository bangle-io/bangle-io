/**
 * @jest-environment jsdom
 */

import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import {
  getPageLocation,
  goToLocation,
  historyUpdateOpenedWsPaths,
} from '@bangle.io/slice-page';
import { makeArrayOfSize } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { goToWorkspaceAuthRoute } from '..';
import { savePrevOpenedWsPathsToSearch } from '../helpers';
import {
  goToWorkspaceHomeRoute,
  goToWsNameRoute,
  pushWsPath,
  updateOpenedWsPaths,
} from '../operations';
import { getActionNamesDispatched, noSideEffectsStore } from './test-utils';

jest.mock('@bangle.io/slice-page', () => {
  const ops = jest.requireActual('@bangle.io/slice-page');

  return {
    ...ops,
    historyUpdateOpenedWsPaths: jest.fn(),
    goToLocation: jest.fn(),
    getPageLocation: jest.fn(),
  };
});

jest.mock('@bangle.io/extension-registry', () => {
  const other = jest.requireActual('@bangle.io/extension-registry');

  return {
    ...other,
    extensionRegistrySliceKey: {
      getSliceStateAsserted: jest.fn(),
    },
  };
});

let historyUpdateOpenedWsPathsMock = jest
  .mocked(historyUpdateOpenedWsPaths)
  .mockImplementation(() => () => {});

const location = {
  search: '',
  pathname: '',
};

const getPageLocationMock = jest
  .mocked(getPageLocation)
  .mockImplementation(() => () => location);

let goToLocationMock = jest
  .mocked(goToLocation)
  .mockImplementation(() => () => {});

let abortController = new AbortController();

let signal = abortController.signal;

beforeEach(() => {
  abortController = new AbortController();
  signal = abortController.signal;
});
afterEach(() => {
  abortController.abort();
});

describe('updateOpenedWsPaths', () => {
  test('no dispatch if wsName is undefined', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: undefined,
    });

    const res = updateOpenedWsPaths((r) => r)(store.state, store.dispatch);

    expect(res).toBe(false);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('works when provided with openedWsPaths', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]
        ?.toArray()
        .filter(Boolean),
    ).toEqual(['my-ws:one.md']);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );
  });

  test('respects replace param', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
      {
        replace: true,
      },
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      { replace: true },
    );
  });

  test('works when provided with openedWsPaths as a function', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:test-note.md'],
    });

    let existingOpenedWsPaths: OpenedWsPaths | undefined;
    const res = updateOpenedWsPaths((r) => {
      existingOpenedWsPaths = r;

      return r.updateByIndex(0, 'my-ws:two.md');
    })(store.state, store.dispatch);

    expect(existingOpenedWsPaths?.primaryWsPath).toEqual('my-ws:test-note.md');
    expect(existingOpenedWsPaths?.secondaryWsPath).toBeFalsy();

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(makeArrayOfSize(MAX_OPEN_EDITORS, null, ['my-ws:two.md', null]));

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );
  });

  test('does not attempt to fix existing (in the slice state) broken paths', () => {
    const { store, dispatchSpy } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:test-notemd'],
    });

    const res = updateOpenedWsPaths((r) => {
      return r;
    })(store.state, store.dispatch);

    expect(res).toBe(false);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
  });

  test('handles invalid path in secondary', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:test-note.md'],
    });

    const res = updateOpenedWsPaths((r) => {
      return r.updateByIndex(1, 'my-ws-hello');
    })(store.state, store.dispatch);

    expect(res).toBe(false);

    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, `/ws-invalid-path/my-ws`, {
      replace: true,
    });
  });
});

describe('pushWsPath', () => {
  let originalOpen = global.open;
  beforeEach(() => {
    global.open = jest.fn();
  });
  afterEach(() => {
    global.open = originalOpen;
  });

  test('works with new tab', () => {
    let { store, dispatchSpy } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:some-other-test-note.md'],
    });
    pushWsPath('my-ws:test-note.md', true)(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(global.open).toBeCalledTimes(1);
    expect(global.open).nthCalledWith(1, '/ws/my-ws/test-note.md');
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('works when tab is false', () => {
    let { store, dispatchSpy } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:some-other-test-note.md'],
    });
    pushWsPath('my-ws:test-note.md')(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray()[0],
    ).toEqual('my-ws:test-note.md');
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray()[1],
    ).toEqual(null);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );

    expect(global.open).toBeCalledTimes(0);
  });

  test('works when secondary is true', () => {
    let { store, dispatchSpy } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:some-other-test-note.md'],
    });
    pushWsPath('my-ws:test-note.md', false, true)(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );

    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray()[0],
    ).toEqual('my-ws:some-other-test-note.md');
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray()[1],
    ).toEqual('my-ws:test-note.md');

    expect(global.open).toBeCalledTimes(0);
  });
});

describe('goToWsNameRoute', () => {
  test('works', () => {
    let searchParams = new URLSearchParams();

    savePrevOpenedWsPathsToSearch(
      OpenedWsPaths.createFromArray(['my-ws:hello.md']),
      searchParams,
    );
    getPageLocationMock.mockImplementation(() => () => ({
      location: '',
      search: searchParams.toString(),
    }));

    let { store } = noSideEffectsStore(signal, {
      wsName: 'old-ws',
      openedWsPaths: ['old-ws:some-other-test-note.md'],
    });

    goToWsNameRoute('my-ws')(store.state, store.dispatch);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      {
        _wsPaths: makeArrayOfSize(MAX_OPEN_EDITORS, undefined, [
          'my-ws:hello.md',
        ]),
      },
      'my-ws',
      { replace: false },
    );
  });

  test('if search has something else', () => {
    getPageLocationMock.mockImplementation(() => () => ({
      location: '',
      search: 'some_garbage',
    }));

    let { store } = noSideEffectsStore(signal, {
      wsName: 'old-ws',
      openedWsPaths: ['old-ws:some-other-test-note.md'],
    });

    goToWsNameRoute('my-ws')(store.state, store.dispatch);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, '/ws/my-ws', { replace: false });
  });

  test('if wsName donot match', () => {
    let searchParams = new URLSearchParams();

    savePrevOpenedWsPathsToSearch(
      OpenedWsPaths.createFromArray(['ws-2:hello.md']),
      searchParams,
    );
    getPageLocationMock.mockImplementation(() => () => ({
      location: '',
      search: searchParams.toString(),
    }));

    let { store } = noSideEffectsStore(signal, {
      wsName: 'old-ws',
      openedWsPaths: [],
    });

    goToWsNameRoute('my-ws')(store.state, store.dispatch);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, '/ws/my-ws', { replace: false });
  });
});

describe('goToWorkspaceHomeRoute', () => {
  test('works', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: undefined,
      openedWsPaths: [],
    });

    goToWorkspaceHomeRoute()(store.state, store.dispatch);

    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, '/', { replace: false });
  });
});

describe('goToWorkspaceAuthRoute', () => {
  test('works', () => {
    let { store } = noSideEffectsStore(signal, {
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:some-other-test-note.md'],
    });

    goToWorkspaceAuthRoute('my-ws', 'SOME_CODE')(store.state, store.dispatch);

    expect(goToLocation).toBeCalledTimes(1);
    expect(goToLocation).nthCalledWith(
      1,
      `/ws-auth/my-ws?error_code=SOME_CODE&ws_paths=${encodeURIComponent(
        `["my-ws:some-other-test-note.md",null,null,null]`,
      )}`,
      { replace: true },
    );
  });
});
