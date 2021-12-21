import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
} from '@bangle.io/baby-fs';
import { sleep } from '@bangle.io/utils';
import {
  FileOps,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';

import { isCurrentWsName, updateWsPaths } from '..';
import { updateLocation } from '../operations';
import {
  createState,
  createStateWithWsName,
  createStore,
  getActionsDispatched,
} from './test-utils';

jest.mock('@bangle.io/workspaces', () => {
  const rest = jest.requireActual('@bangle.io/workspaces');
  return {
    ...rest,
    FileOps: {
      renameFile: jest.fn(),
      deleteFile: jest.fn(),
      getDoc: jest.fn(),
      saveDoc: jest.fn(),
      listAllFiles: jest.fn(),
      checkFileExists: jest.fn(),
    },
  };
});

let listAllFilesMock = FileOps.listAllFiles as jest.MockedFunction<
  typeof FileOps.listAllFiles
>;

beforeEach(() => {
  listAllFilesMock.mockResolvedValue([]);
});

test('updateLocation', () => {
  let state = createState();

  const dispatch = jest.fn();

  updateLocation({ search: 'test-search', pathname: 'test-pathname' })(
    state,
    dispatch,
  );

  expect(dispatch).toBeCalledTimes(1);
});

test('isCurrentWsName', () => {
  let state = createStateWithWsName('my-workspace');

  expect(isCurrentWsName('my-workspace')(state)).toBe(true);
  expect(isCurrentWsName('not')(state)).toBe(false);
});

describe('updateWsPaths', () => {
  test('updateWsPaths 1', async () => {
    listAllFilesMock.mockResolvedValue(['my-ws:one.md']);
    let { store, dispatchSpy } = createStore({
      locationPathname: '/ws/my-ws',
    });

    updateWsPaths('my-ws')(store.state, store.dispatch, store);
    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: ['my-ws:one.md'],
    });
  });

  test('does not update if not the same workspace', async () => {
    let res;
    listAllFilesMock.mockImplementation(
      () =>
        new Promise((_res) => {
          res = _res;
        }),
    );
    let { store, dispatchSpy } = createStore({
      locationPathname: '/ws/my-ws',
    });

    updateWsPaths('my-ws')(store.state, store.dispatch, store);

    // change the workspace
    updateLocation({ pathname: '/ws/some-other-ws' })(
      store.state,
      store.dispatch,
    );

    res(['my-ws:one.md']);

    await sleep(5);

    expect(listAllFilesMock).toBeCalledTimes(1);
    expect(getActionsDispatched(dispatchSpy)).not.toContain(
      'action::workspace-context:update-ws-paths',
    );
  });

  test('handles error', async () => {
    listAllFilesMock.mockRejectedValue(new BaseFileSystemError('test-error'));
    let { store, dispatchSpy } = createStore({
      locationPathname: '/ws/my-ws',
    });

    updateWsPaths('my-ws')(store.state, store.dispatch, store);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionsDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: undefined,
    });
  });

  test('handles permission error', async () => {
    listAllFilesMock.mockRejectedValue(
      new BaseFileSystemError('test-error', NATIVE_BROWSER_PERMISSION_ERROR),
    );
    let { store, dispatchSpy } = createStore({
      locationPathname: '/ws/my-ws',
    });

    updateWsPaths('my-ws')(store.state, store.dispatch, store);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionsDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-auth-error',
      'action::workspace-context:update-ws-paths',
    ]);

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::bangle-store:history-auth-error',
      value: {
        wsName: 'my-ws',
      },
    });

    expect(dispatchSpy).nthCalledWith(2, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: undefined,
    });
  });

  test('handles workspace not found error', async () => {
    listAllFilesMock.mockRejectedValue(
      new WorkspaceError('test-error', WORKSPACE_NOT_FOUND_ERROR),
    );
    let { store, dispatchSpy } = createStore({
      locationPathname: '/ws/my-ws',
    });

    updateWsPaths('my-ws')(store.state, store.dispatch, store);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionsDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-ws-not-found',
      'action::workspace-context:update-ws-paths',
    ]);

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::bangle-store:history-ws-not-found',
      value: {
        wsName: 'my-ws',
      },
    });

    expect(dispatchSpy).nthCalledWith(2, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: undefined,
    });
  });
});
