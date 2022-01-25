/**
 * @jest-environment jsdom
 */
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
} from '@bangle.io/baby-fs';
import { HELP_FS_WORKSPACE_NAME } from '@bangle.io/constants';
import {
  ExtensionRegistry,
  extensionRegistrySliceKey,
} from '@bangle.io/extension-registry';
import {
  getPageLocation,
  goToLocation,
  historyUpdateOpenedWsPaths,
} from '@bangle.io/slice-page';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { goToWorkspaceHomeRoute } from '..';
import { savePrevOpenedWsPathsToSearch } from '../helpers';
import {
  goToWsNameRoute,
  pushWsPath,
  updateOpenedWsPaths,
} from '../operations';
import { getActionNamesDispatched, noSideEffectsStore } from './test-utils';

jest.mock('../workspaces/file-system', () => {
  const rest = jest.requireActual('../workspaces/file-system');
  return {
    ...rest,
    renameFile: jest.fn(),
    deleteFile: jest.fn(),
    getDoc: jest.fn(),
    saveDoc: jest.fn(),
    listAllFiles: jest.fn(),
    checkFileExists: jest.fn(),
  };
});

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

describe('updateOpenedWsPaths', () => {
  test('no dispatch if wsName is undefined', () => {
    let { store } = noSideEffectsStore({
      wsName: undefined,
    });

    const res = updateOpenedWsPaths((r) => r)(store.state, store.dispatch);

    expect(res).toBe(false);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(0);
  });

  test('works when provided with openedWsPaths', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
      wsName: 'my-ws',
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:one.md', null]);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );
  });

  test('respects replace param', () => {
    let { store } = noSideEffectsStore({
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
    let { store } = noSideEffectsStore({
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:test-note.md'],
    });

    let existingOpenedWsPaths: OpenedWsPaths | undefined;
    const res = updateOpenedWsPaths((r) => {
      existingOpenedWsPaths = r;
      return r.updateByIndex(0, 'my-ws:two.md');
    })(store.state, store.dispatch);

    expect(existingOpenedWsPaths?.toArray()).toEqual([
      'my-ws:test-note.md',
      null,
    ]);

    expect(res).toBe(true);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:two.md', null]);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );
  });

  test('does not attempt to fix existing (in the slice state) broken paths', () => {
    const { store, dispatchSpy } = noSideEffectsStore({
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
    let { store } = noSideEffectsStore({
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
    let { store, dispatchSpy } = noSideEffectsStore({
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
    let { store, dispatchSpy } = noSideEffectsStore({
      wsName: 'my-ws',
      openedWsPaths: ['my-ws:some-other-test-note.md'],
    });
    pushWsPath('my-ws:test-note.md')(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:test-note.md', null]);

    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      expect.any(OpenedWsPaths),
      'my-ws',
      undefined,
    );

    expect(global.open).toBeCalledTimes(0);
  });

  test('works when secondary is true', () => {
    let { store, dispatchSpy } = noSideEffectsStore({
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
      historyUpdateOpenedWsPathsMock.mock.calls[0]?.[0]?.toArray(),
    ).toEqual(['my-ws:some-other-test-note.md', 'my-ws:test-note.md']);

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

    let { store } = noSideEffectsStore({
      wsName: 'old-ws',
      openedWsPaths: ['old-ws:some-other-test-note.md'],
    });

    goToWsNameRoute('my-ws')(store.state, store.dispatch);

    expect(historyUpdateOpenedWsPathsMock).toBeCalledTimes(1);
    expect(historyUpdateOpenedWsPathsMock).nthCalledWith(
      1,
      { wsPaths: ['my-ws:hello.md', undefined] },
      'my-ws',
      { replace: false },
    );
  });

  test('if search has something else', () => {
    getPageLocationMock.mockImplementation(() => () => ({
      location: '',
      search: 'some_garbage',
    }));

    let { store } = noSideEffectsStore({
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

    let { store } = noSideEffectsStore({
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
    let { store } = noSideEffectsStore({
      wsName: undefined,
      openedWsPaths: [],
    });

    goToWorkspaceHomeRoute()(store.state, store.dispatch);

    expect(goToLocationMock).toBeCalledTimes(1);
    expect(goToLocationMock).nthCalledWith(1, '/', { replace: false });
  });
});
