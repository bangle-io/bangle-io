import { WorkspaceType } from '@bangle.io/constants';
import { goToLocation } from '@bangle.io/slice-page';
import {
  createBasicTestStore,
  createPMNode,
  setupMockWorkspaceWithNotes,
} from '@bangle.io/test-utils';
import { sleep } from '@bangle.io/utils';
import { OpenedWsPaths } from '@bangle.io/ws-path';

import { workspaceSliceKey } from '../common';
import {
  checkFileExists,
  createNote,
  deleteNote,
  getNote,
  refreshWsPaths,
  renameNote,
  saveDoc,
} from '../file-operations';
import { updateOpenedWsPaths } from '../operations';
import { createWorkspace } from '../workspaces-operations';

describe('renameNote', () => {
  const doc = createPMNode([], `hello`);
  let { store } = createBasicTestStore();

  beforeEach(async () => {
    ({ store } = createBasicTestStore());

    await createWorkspace('my-ws', WorkspaceType.browser)(
      store.state,
      store.dispatch,
      store,
    );

    await createNote('my-ws:test-note.md', {
      doc: doc,
    })(store.state, store.dispatch, store);
  });

  afterEach(() => {
    store.destroy();
  });

  test('returns false when wsName is not defined', async () => {
    let { store, dispatchSpy } = createBasicTestStore();

    const res = await renameNote(
      'my-ws:test-note.md',
      'my-ws:new-test-note.md',
    )(store.state, store.dispatch, store);

    expect(res).toBe(false);
    expect(dispatchSpy).toBeCalledTimes(0);
  });

  test('works when the file to be renamed is opened', async () => {
    await renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    const newDoc = await getNote('my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
    );

    expect(newDoc?.toJSON()).toEqual(doc.toJSON());

    await sleep(0);

    const { noteWsPaths, openedWsPaths } =
      workspaceSliceKey.getSliceStateAsserted(store.state);

    expect(noteWsPaths).toContain('my-ws:new-test-note.md');
    expect(openedWsPaths.primaryWsPath).toBe('my-ws:new-test-note.md');
  });

  test('works when the file to be renamed is opened in secondary', async () => {
    let { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    expect(openedWsPaths.toArray()).toEqual(['my-ws:test-note.md', null]);

    await updateOpenedWsPaths(
      OpenedWsPaths.createFromArray([null, 'my-ws:test-note.md']),
    )(store.state, store.dispatch);

    await renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    ({ openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(store.state));

    expect(openedWsPaths.toArray()).toEqual([null, 'my-ws:new-test-note.md']);
  });

  test('works when the file to be renamed is not opened', async () => {
    await goToLocation('/ws/my-ws')(store.state, store.dispatch);
    await sleep(0);

    let { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    expect(openedWsPaths.toArray()).toEqual([null, null]);

    await renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    ({ openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(store.state));

    const newDoc = await getNote('my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
    );

    expect(newDoc?.toJSON()).toEqual(doc.toJSON());
  });

  test('renaming the same file', async () => {
    await expect(
      renameNote('my-ws:test-note.md', 'my-ws:test-note.md')(
        store.state,
        store.dispatch,
        store,
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BABY_FS_FILE_ALREADY_EXISTS_ERROR:File already exists"`,
    );

    const newDoc = await getNote('my-ws:test-note.md')(
      store.state,
      store.dispatch,
    );
    expect(newDoc?.toJSON()).toEqual(doc.toJSON());
  });

  test('renaming  when primary and secondary are same', async () => {
    await updateOpenedWsPaths(
      OpenedWsPaths.createFromArray([
        'my-ws:test-note.md',
        'my-ws:test-note.md',
      ]),
    )(store.state, store.dispatch);

    await renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    let { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    expect(openedWsPaths.toArray()).toEqual([
      'my-ws:new-test-note.md',
      'my-ws:new-test-note.md',
    ]);
  });
});

describe('getNote', () => {
  test('works', async () => {
    const doc = createPMNode([], `hello`);
    let { store } = createBasicTestStore();
    await createWorkspace('my-ws', WorkspaceType.browser)(
      store.state,
      store.dispatch,
      store,
    );

    await createNote('my-ws:test-note.md', {
      doc: doc,
    })(store.state, store.dispatch, store);

    expect(
      (
        await getNote('my-ws:test-note.md')(store.state, store.dispatch)
      )?.toJSON(),
    ).toEqual(doc.toJSON());
  });

  test('does not return result when no wsName', async () => {
    let { store, getActionNames } = createBasicTestStore();

    await sleep(0);

    let priorLen = getActionNames().length;
    expect(
      await getNote('my-ws:test-note.md')(store.state, store.dispatch),
    ).toEqual(undefined);

    expect(getActionNames().length).toBe(priorLen);
  });
});

describe('createNote', () => {
  const doc = createPMNode([], `hello`);
  let { store } = createBasicTestStore();

  beforeEach(async () => {
    ({ store } = createBasicTestStore());

    await createWorkspace('my-ws', WorkspaceType.browser)(
      store.state,
      store.dispatch,
      store,
    );
  });
  afterEach(() => {
    store.destroy();
  });

  test('creates note', async () => {
    const wsPath: string = 'my-ws:new-test-note.md';

    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    await sleep(0);

    expect(
      (await getNote(wsPath)(store.state, store.dispatch))?.toString(),
    ).toMatchInlineSnapshot(`"doc(paragraph(\\"hello\\"))"`);

    const { noteWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    const { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    expect(openedWsPaths.toArray()).toEqual(['my-ws:new-test-note.md', null]);

    expect(noteWsPaths).toContain('my-ws:new-test-note.md');
  });

  test('does not overwrrite an existing file', async () => {
    const wsPath: string = 'my-ws:new-test-note.md';

    await createNote(wsPath, { doc })(store.state, store.dispatch, store);
    const docModified = createPMNode([], `hello modified`);

    await saveDoc(wsPath, docModified)(store.state, store.dispatch, store);

    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    expect(
      (await getNote(wsPath)(store.state, store.dispatch))?.toJSON(),
    ).toEqual(docModified.toJSON());
  });

  test('does not create when no workspace', async () => {
    let { store } = createBasicTestStore();

    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    await createNote(wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );

    expect(await getNote(wsPath)(store.state, store.dispatch)).toBe(undefined);
  });

  test('when open is false', async () => {
    const wsPath: string = 'my-ws:new-test-note.md';

    await createNote(wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );

    const { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    expect(openedWsPaths.toArray()).toEqual([null, null]);
  });
});

describe('deleteNote', () => {
  const doc = createPMNode([], `hello`);
  let { store } = createBasicTestStore();
  const wsPath = 'my-ws:test-note.md';

  beforeEach(async () => {
    ({ store } = createBasicTestStore());

    await createWorkspace('my-ws', WorkspaceType.browser)(
      store.state,
      store.dispatch,
      store,
    );
  });

  afterEach(() => {
    store.destroy();
  });

  test('deletes when the file is opened', async () => {
    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    await sleep(0);

    expect(
      workspaceSliceKey
        .getSliceStateAsserted(store.state)
        .openedWsPaths.toArray(),
    ).toEqual([wsPath, null]);

    await deleteNote(wsPath)(store.state, store.dispatch, store);

    await sleep(0);

    await expect(
      getNote(wsPath)(store.state, store.dispatch),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BABY_FS_FILE_NOT_FOUND_ERROR:File my-ws/test-note.md not found"`,
    );

    expect(
      workspaceSliceKey
        .getSliceStateAsserted(store.state)
        .openedWsPaths.toArray(),
    ).toEqual([null, null]);
  });

  test('deletes when the file is not opened', async () => {
    await createNote(wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );

    await sleep(0);

    expect(
      workspaceSliceKey
        .getSliceStateAsserted(store.state)
        .openedWsPaths.toArray(),
    ).toEqual([null, null]);

    await deleteNote(wsPath)(store.state, store.dispatch, store);

    await sleep(0);

    await expect(
      getNote(wsPath)(store.state, store.dispatch),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BABY_FS_FILE_NOT_FOUND_ERROR:File my-ws/test-note.md not found"`,
    );

    expect(
      workspaceSliceKey
        .getSliceStateAsserted(store.state)
        .openedWsPaths.toArray(),
    ).toEqual([null, null]);
  });

  test('deletes multiple files', async () => {
    await createNote(wsPath, { doc, open: false })(
      store.state,
      store.dispatch,
      store,
    );
    const wsPath2 = 'my-ws:test-note-2.md';

    await createNote(wsPath2, { doc })(store.state, store.dispatch, store);

    await deleteNote([wsPath, wsPath2])(store.state, store.dispatch, store);

    await expect(
      getNote(wsPath)(store.state, store.dispatch),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BABY_FS_FILE_NOT_FOUND_ERROR:File my-ws/test-note.md not found"`,
    );

    await expect(
      getNote(wsPath2)(store.state, store.dispatch),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BABY_FS_FILE_NOT_FOUND_ERROR:File my-ws/test-note-2.md not found"`,
    );
  });
});

describe('checkFileExists', () => {
  const doc = createPMNode([], `hello`);
  let { store } = createBasicTestStore();
  const wsPath = 'my-ws:test-note.md';

  beforeEach(async () => {
    ({ store } = createBasicTestStore());

    await createWorkspace('my-ws', WorkspaceType.browser)(
      store.state,
      store.dispatch,
      store,
    );
  });

  afterEach(() => {
    store.destroy();
  });

  test('works', async () => {
    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    const result = await checkFileExists('my-ws:test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    expect(result).toBe(true);
  });

  test('false when file does not exists', async () => {
    const result = await checkFileExists('my-ws:test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    expect(result).toBe(false);
  });
});

describe('listAllFiles', () => {
  test('works', async () => {
    const { store } = await setupMockWorkspaceWithNotes(undefined, 'kujo', [
      ['kujo:one.md', 'hi'],
      ['kujo:two.md', 'bye'],
    ]);

    await refreshWsPaths();

    expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths)
      .toMatchInlineSnapshot(`
            Array [
              "kujo:one.md",
              "kujo:two.md",
            ]
          `);
  });
});
