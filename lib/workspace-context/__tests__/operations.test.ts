import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
} from '@bangle.io/baby-fs';
import { ExtensionRegistry } from '@bangle.io/extension-registry';
import { sleep } from '@bangle.io/utils';
import {
  FileOps,
  HELP_FS_WORKSPACE_NAME,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import {
  checkFileExists,
  createNote,
  deleteNote,
  getFileOps,
  getNote,
  isCurrentWsName,
  pushWsPath,
  refreshWsPaths,
  renameNote,
  updateOpenedWsPaths,
} from '..';
import { updateLocation } from '../operations';
import {
  createState,
  createStateWithWsName,
  createStore,
  getActionNamesDispatched,
  getActionsDispatched,
  noDispatchStore,
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
let renameFileMock = FileOps.renameFile as jest.MockedFunction<
  typeof FileOps.renameFile
>;
let checkFileExistsMock = FileOps.checkFileExists as jest.MockedFunction<
  typeof FileOps.checkFileExists
>;
let saveDocMock = FileOps.saveDoc as jest.MockedFunction<
  typeof FileOps.saveDoc
>;
let deleteFileMock = FileOps.deleteFile as jest.MockedFunction<
  typeof FileOps.deleteFile
>;

beforeEach(() => {
  listAllFilesMock.mockResolvedValue([]);
  renameFileMock.mockResolvedValue(undefined);
  checkFileExistsMock.mockResolvedValue(false);
  saveDocMock.mockResolvedValue(undefined);
  deleteFileMock.mockResolvedValue(undefined);
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
    listAllFilesMock.mockImplementation(async () => {
      return ['my-ws:one.md'];
    });
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);
    expect(listAllFilesMock).toBeCalledWith('my-ws');

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: {
        wsName: 'my-ws',
        wsPaths: ['my-ws:one.md'],
      },
    });
  });

  test('does not dispatch if no workspace', async () => {
    listAllFilesMock.mockImplementation(async () => {
      return ['my-ws:one.md'];
    });

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '',
    });

    refreshWsPaths()(store.state, store.dispatch);

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(0);
    expect(listAllFilesMock).toBeCalledTimes(0);
  });

  test('handles error', async () => {
    listAllFilesMock.mockRejectedValue(new BaseFileSystemError('test-error'));
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(dispatchSpy).toBeCalledTimes(1);

    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::workspace-context:update-ws-paths',
      value: {
        wsName: 'my-ws',
        wsPaths: undefined,
      },
    });
  });

  test('handles permission error', async () => {
    listAllFilesMock.mockRejectedValue(
      new BaseFileSystemError('test-error', NATIVE_BROWSER_PERMISSION_ERROR),
    );
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
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
      value: {
        wsName: 'my-ws',
        wsPaths: undefined,
      },
    });
  });

  test('handles workspace not found error', async () => {
    listAllFilesMock.mockRejectedValue(
      new WorkspaceError('test-error', WORKSPACE_NOT_FOUND_ERROR),
    );
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    refreshWsPaths()(store.state, store.dispatch);

    expect(listAllFilesMock).toBeCalledTimes(1);

    await sleep(5);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
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
      value: {
        wsName: 'my-ws',
        wsPaths: undefined,
      },
    });
  });
});

test('getFileOps', async () => {
  listAllFilesMock.mockResolvedValue(['my-ws:one.md']);
  let { store } = createStore({
    locationPathname: '/ws/my-ws',
  });

  const fileOps = getFileOps()(store.state, store.dispatch);
  expect(await fileOps?.listAllFiles('my-ws')).toMatchInlineSnapshot(`
    Array [
      "my-ws:one.md",
    ]
  `);
});

describe('updateOpenedWsPaths', () => {
  test('no dispatch if wsName is undefined', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '',
    });

    const res = updateOpenedWsPaths((r) => r)(store.state, store.dispatch);

    expect(res).toBe(false);
    expect(dispatchSpy).toBeCalledTimes(0);
  });

  test('works when provided with openedWsPaths', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::bangle-store:history-update-opened-ws-paths',
      value: {
        openedWsPathsArray: ['my-ws:one.md', null],
        replace: false,
        wsName: 'my-ws',
      },
    });
  });

  test('respects replace param', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    const res = updateOpenedWsPaths(
      OpenedWsPaths.createFromArray(['my-ws:one.md']),
      {
        replaceHistory: true,
      },
    )(store.state, store.dispatch);

    expect(res).toBe(true);
    expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::bangle-store:history-update-opened-ws-paths',
      value: {
        openedWsPathsArray: ['my-ws:one.md', null],
        replace: true,
        wsName: 'my-ws',
      },
    });
  });

  test('works when provided with openedWsPaths as a function', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
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
    expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::bangle-store:history-update-opened-ws-paths',
      value: {
        openedWsPathsArray: ['my-ws:two.md', null],
        replace: false,
        wsName: 'my-ws',
      },
    });
  });

  test('does not attempt to fix existing (in the slice state) broken paths', () => {
    const { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-notemd',
    });
    const res = updateOpenedWsPaths((r) => {
      return r;
    })(store.state, store.dispatch);

    expect(res).toBe(false);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
  });

  test('handles invalid path in secondary', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    const res = updateOpenedWsPaths((r) => {
      return r.updateByIndex(1, 'my-ws-hello');
    })(store.state, store.dispatch);

    expect(res).toBe(false);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-on-invalid-path',
    ]);

    // expect(dispatchSpy).toBeCalledTimes(1);
    expect(dispatchSpy).nthCalledWith(1, {
      id: expect.any(String),
      name: 'action::bangle-store:history-on-invalid-path',
      value: {
        invalidPath: 'my-ws-hello',
        wsName: 'my-ws',
      },
    });
  });
});

describe('renameNote', () => {
  test('returns false when wsName is not defined', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '',
    });

    const res = renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    expect(res).toBe(false);
    expect(dispatchSpy).toBeCalledTimes(0);
  });

  test('works when the file to be renamed is opened', async () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-update-opened-ws-paths',
      'action::workspace-context:update-ws-paths',
    ]);

    expect(
      getActionsDispatched(
        dispatchSpy,
        'action::bangle-store:history-update-opened-ws-paths',
      ),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::bangle-store:history-update-opened-ws-paths',
        value: {
          openedWsPathsArray: ['my-ws:new-test-note.md', null],
          replace: true,
          wsName: 'my-ws',
        },
      },
    ]);
  });

  test('works when the file to be renamed is opened in secondary', async () => {
    const newSearch = new URLSearchParams('');
    newSearch.set('secondary', 'my-ws:test-note.md');

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
      locationSearchQuery: newSearch.toString(),
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(
      getActionsDispatched(
        dispatchSpy,
        'action::bangle-store:history-update-opened-ws-paths',
      ),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::bangle-store:history-update-opened-ws-paths',
        value: {
          openedWsPathsArray: [null, 'my-ws:new-test-note.md'],
          replace: true,
          wsName: 'my-ws',
        },
      },
    ]);
  });

  test('works when the file to be renamed is not opened', async () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/my-other-file.md',
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });

  test('renaming the same file', async () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    renameNote('my-ws:test-note.md', 'my-ws:test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });

  test('renaming the when primary and secondary are same', async () => {
    const newSearch = new URLSearchParams('');
    newSearch.set('secondary', 'my-ws:test-note.md');

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
      locationSearchQuery: newSearch,
    });

    renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(renameFileMock).toBeCalledTimes(1);
    expect(renameFileMock).nthCalledWith(
      1,
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-update-opened-ws-paths',
      'action::workspace-context:update-ws-paths',
    ]);

    expect(
      getActionsDispatched(
        dispatchSpy,
        'action::bangle-store:history-update-opened-ws-paths',
      ),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::bangle-store:history-update-opened-ws-paths',
        value: {
          openedWsPathsArray: [
            'my-ws:new-test-note.md',
            'my-ws:new-test-note.md',
          ],
          replace: true,
          wsName: 'my-ws',
        },
      },
    ]);
  });

  test('throws error when renaming a help doc', () => {
    let { store } = noDispatchStore({
      locationPathname: '/ws/' + HELP_FS_WORKSPACE_NAME,
    });

    expect(() =>
      renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
        store.state,
        store.dispatch,
        store,
      ),
    ).toThrowErrorMatchingInlineSnapshot(`"Cannot rename a help document"`);
  });
});

describe('getNote', () => {
  test('works', async () => {
    const result = {};
    (FileOps.getDoc as any).mockResolvedValue(result);
    const extensionRegistry: ExtensionRegistry = {} as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws',
    });

    expect(
      await getNote(extensionRegistry, wsPath)(store.state, store.dispatch),
    ).toBe(result);

    expect(FileOps.getDoc).toBeCalledTimes(1);
    expect(dispatchSpy).toBeCalledTimes(0);
  });

  test('does not return result when no wsName', async () => {
    const result = {};
    (FileOps.getDoc as any).mockResolvedValue(result);
    const extensionRegistry: ExtensionRegistry = {} as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '',
    });

    expect(
      await getNote(extensionRegistry, wsPath)(store.state, store.dispatch),
    ).toBe(undefined);
    expect(FileOps.getDoc).toBeCalledTimes(0);
    expect(dispatchSpy).toBeCalledTimes(0);
  });
});

describe('createNote', () => {
  test('works when file does not exist', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    createNote(extensionRegistry, wsPath, { doc })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);
    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, wsPath);

    expect(saveDocMock).toBeCalledTimes(1);
    expect(saveDocMock).nthCalledWith(
      1,
      wsPath,
      doc,
      extensionRegistry.specRegistry,
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-update-opened-ws-paths',
      'action::workspace-context:update-ws-paths',
    ]);
  });

  test('works when file exists', async () => {
    checkFileExistsMock.mockResolvedValue(true);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    createNote(extensionRegistry, wsPath, { doc })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);
    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, wsPath);

    expect(saveDocMock).toBeCalledTimes(0);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-update-opened-ws-paths',
      'action::workspace-context:update-ws-paths',
    ]);
  });

  test('does not create when no workspace', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '',
    });

    createNote(extensionRegistry, wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );
    await sleep(0);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);
  });

  test('when open is false', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    const extensionRegistry: ExtensionRegistry = {
      specRegistry: {},
    } as any;
    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    createNote(extensionRegistry, wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);
    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, wsPath);

    expect(saveDocMock).toBeCalledTimes(1);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });
});

describe('deleteNote', () => {
  test('deletes when the file is opened', async () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/test-note.md',
    });

    deleteNote('my-ws:test-note.md')(store.state, store.dispatch, store);

    await sleep(0);
    expect(deleteFileMock).toBeCalledTimes(1);
    expect(deleteFileMock).nthCalledWith(1, 'my-ws:test-note.md');

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-update-opened-ws-paths',
      'action::workspace-context:update-ws-paths',
    ]);

    expect(
      getActionsDispatched(
        dispatchSpy,
        'action::bangle-store:history-update-opened-ws-paths',
      ),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::bangle-store:history-update-opened-ws-paths',
        value: {
          openedWsPathsArray: [null, null],
          replace: true,
          wsName: 'my-ws',
        },
      },
    ]);
  });

  test('deletes when the file is not opened', async () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/some-other-test-note.md',
    });

    deleteNote('my-ws:test-note.md')(store.state, store.dispatch, store);

    await sleep(0);
    expect(deleteFileMock).toBeCalledTimes(1);
    expect(deleteFileMock).nthCalledWith(1, 'my-ws:test-note.md');

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });

  test('deletes multiple files', async () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/some-other-test-note.md',
    });

    deleteNote(['my-ws:test-note1.md', 'my-ws:test-note2.md'])(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(deleteFileMock).toBeCalledTimes(2);
    expect(deleteFileMock).nthCalledWith(1, 'my-ws:test-note1.md');
    expect(deleteFileMock).nthCalledWith(2, 'my-ws:test-note2.md');

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::workspace-context:update-ws-paths',
    ]);
  });
});

describe('pushWsPath', () => {
  let originalOpen = window.open;
  beforeEach(() => {
    window.open = jest.fn();
  });
  afterEach(() => {
    window.open = originalOpen;
  });

  test('works with new tab', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/some-other-test-note.md',
    });
    pushWsPath('my-ws:test-note.md', true)(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(window.open).toBeCalledTimes(1);
    expect(window.open).nthCalledWith(1, '/ws/my-ws/test-note.md');
  });

  test('works when tab is false', () => {
    let { store, dispatchSpy } = noDispatchStore({
      locationPathname: '/ws/my-ws/some-other-test-note.md',
    });
    pushWsPath('my-ws:test-note.md')(store.state, store.dispatch);

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([
      'action::bangle-store:history-update-opened-ws-paths',
    ]);

    expect(window.open).toBeCalledTimes(0);
  });
});

describe('checkFileExists', () => {
  test('works', async () => {
    checkFileExistsMock.mockResolvedValue(true);
    let { store, dispatchSpy } = noDispatchStore({});

    const result = await checkFileExists('my-ws:test-note.md')(
      store.state,
      store.dispatch,
    );

    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(result).toBe(true);
  });

  test('false when file does not exists', async () => {
    checkFileExistsMock.mockResolvedValue(false);
    let { store, dispatchSpy } = noDispatchStore({});

    const result = await checkFileExists('my-ws:test-note.md')(
      store.state,
      store.dispatch,
    );

    expect(checkFileExistsMock).toBeCalledTimes(1);
    expect(checkFileExistsMock).nthCalledWith(1, 'my-ws:test-note.md');
    expect(getActionNamesDispatched(dispatchSpy)).toEqual([]);

    expect(result).toBe(false);
  });
});
