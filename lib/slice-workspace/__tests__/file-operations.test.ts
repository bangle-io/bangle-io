import { WorkspaceTypeBrowser } from '@bangle.io/constants';
import { goToLocation } from '@bangle.io/slice-page';
import {
  createBasicTestStore,
  createPMNode,
  setupMockWorkspaceWithNotes,
  waitForExpect,
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
  writeNote,
} from '../file-operations';
import { updateOpenedWsPaths } from '../operations';
import { createWorkspace } from '../workspaces-operations';

let { store } = createBasicTestStore({});

beforeEach(() => {
  store.destroy();
  ({ store } = createBasicTestStore({}));
});

afterEach(async () => {
  await sleep(0);
});

describe('renameNote', () => {
  const doc = createPMNode([], `hello`);

  beforeEach(async () => {
    await createWorkspace('my-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );

    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        'my-ws',
      );
    });

    await createNote('my-ws:test-note.md', {
      doc: doc,
    })(store.state, store.dispatch, store);

    await waitForExpect(() => {
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state).openedWsPaths
          .primaryWsPath,
      ).toBe('my-ws:test-note.md');
    });
  });

  test('returns error when wsName is not defined', async () => {
    await expect(
      renameNote('my-wrong-ws:test-note.md', 'my-wrong-ws:new-test-note.md')(
        store.state,
        store.dispatch,
        store,
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Workspace my-wrong-ws not found"`,
    );
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
      store,
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
    expect(openedWsPaths.primaryWsPath).toEqual('my-ws:test-note.md');
    expect(openedWsPaths.secondaryWsPath).toBeFalsy();

    await updateOpenedWsPaths(
      OpenedWsPaths.createFromArray([null, 'my-ws:test-note.md']),
    )(store.state, store.dispatch);

    await renameNote('my-ws:test-note.md', 'my-ws:new-test-note.md')(
      store.state,
      store.dispatch,
      store,
    );

    await waitForExpect(() => {
      let { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      );

      expect(openedWsPaths.primaryWsPath).toBeFalsy();
      expect(openedWsPaths.secondaryWsPath).toEqual('my-ws:new-test-note.md');
    });
  });

  test('works when the file to be renamed is not opened', async () => {
    await goToLocation('/ws/my-ws')(store.state, store.dispatch);
    await waitForExpect(() => {
      expect(
        workspaceSliceKey
          .getSliceStateAsserted(store.state)
          .openedWsPaths.hasSomeOpenedWsPaths(),
      ).toBe(false);
    });

    let { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    expect(openedWsPaths.toArray().filter(Boolean)).toEqual([]);

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
      store,
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
      `"Cannot rename; File \\"my-ws/test-note.md\\" already exists"`,
    );

    const newDoc = await getNote('my-ws:test-note.md')(
      store.state,
      store.dispatch,
      store,
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

    await waitForExpect(() => {
      let { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      );

      expect(openedWsPaths.primaryWsPath).toEqual('my-ws:new-test-note.md');
      expect(openedWsPaths.secondaryWsPath).toEqual('my-ws:new-test-note.md');
    });
  });
});

describe('getNote', () => {
  test('works', async () => {
    const doc = createPMNode([], `hello`);
    await createWorkspace('my-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );
    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        'my-ws',
      );
    });

    await createNote('my-ws:test-note.md', {
      doc: doc,
    })(store.state, store.dispatch, store);

    expect(
      (
        await getNote('my-ws:test-note.md')(store.state, store.dispatch, store)
      )?.toJSON(),
    ).toEqual(doc.toJSON());
  });

  test('does not return result when no wsName', async () => {
    let { store, getActionNames } = createBasicTestStore({});

    await sleep(0);

    let priorLen = getActionNames().length;
    await expect(
      getNote('my-ws:test-note.md')(store.state, store.dispatch, store),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Workspace my-ws not found"`);

    expect(getActionNames().length).toBe(priorLen);
  });
});

describe('createNote', () => {
  const doc = createPMNode([], `hello`);

  beforeEach(async () => {
    ({ store } = createBasicTestStore({}));

    await createWorkspace('my-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );
    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        'my-ws',
      );
    });
  });
  afterEach(() => {
    store.destroy();
  });

  test('creates note', async () => {
    const wsPath: string = 'my-ws:new-test-note.md';

    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    await waitForExpect(async () => {
      expect(
        (await getNote(wsPath)(store.state, store.dispatch, store))?.toString(),
      ).toEqual(`doc(paragraph("hello"))`);
    });

    const { noteWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );

    const { openedWsPaths } = workspaceSliceKey.getSliceStateAsserted(
      store.state,
    );
    expect(openedWsPaths.primaryWsPath).toEqual('my-ws:new-test-note.md');
    expect(openedWsPaths.secondaryWsPath).toBeFalsy();

    expect(noteWsPaths).toContain('my-ws:new-test-note.md');
  });

  test('does not overwrrite an existing file', async () => {
    const wsPath: string = 'my-ws:new-test-note.md';

    await createNote(wsPath, { doc })(store.state, store.dispatch, store);
    const docModified = createPMNode([], `hello modified`);

    await writeNote(wsPath, docModified)(store.state, store.dispatch, store);

    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    expect(
      (await getNote(wsPath)(store.state, store.dispatch, store))?.toJSON(),
    ).toEqual(docModified.toJSON());
  });

  test('does not create when no workspace', async () => {
    let { store } = createBasicTestStore({});

    const wsPath: string = 'my-ws:new-test-note.md';
    const doc: any = {};

    expect(
      await createNote(wsPath, { doc, open: false })(
        store.state,
        store.dispatch,
        store,
      ),
    ).toBe(false);

    store.destroy();
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

    expect(openedWsPaths.toArray().filter(Boolean)).toEqual([]);
  });
});

describe('deleteNote', () => {
  const doc = createPMNode([], `hello`);
  const wsPath = 'my-ws:test-note.md';

  beforeEach(async () => {
    await createWorkspace('my-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );
    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        'my-ws',
      );
    });
  });

  afterEach(() => {
    store.destroy();
  });

  test('deletes when the file is opened', async () => {
    await createNote(wsPath, { doc })(store.state, store.dispatch, store);

    await waitForExpect(() => {
      const openedWsPaths = workspaceSliceKey.getSliceStateAsserted(
        store.state,
      ).openedWsPaths;

      expect(openedWsPaths.primaryWsPath).toBe(wsPath);
      expect(openedWsPaths.secondaryWsPath).toBeFalsy();
    });

    await deleteNote(wsPath)(store.state, store.dispatch, store);

    await sleep(0);

    await expect(
      getNote(wsPath)(store.state, store.dispatch, store),
    ).resolves.toBeUndefined();

    expect(
      workspaceSliceKey
        .getSliceStateAsserted(store.state)
        .openedWsPaths.hasSomeOpenedWsPaths(),
    ).toEqual(false);
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
        .openedWsPaths.hasSomeOpenedWsPaths(),
    ).toBe(false);

    await deleteNote(wsPath)(store.state, store.dispatch, store);

    await sleep(0);

    await expect(
      getNote(wsPath)(store.state, store.dispatch, store),
    ).resolves.toBeUndefined();

    expect(
      workspaceSliceKey
        .getSliceStateAsserted(store.state)
        .openedWsPaths.hasSomeOpenedWsPaths(),
    ).toEqual(false);
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
      getNote(wsPath)(store.state, store.dispatch, store),
    ).resolves.toBeUndefined();

    await expect(
      getNote(wsPath2)(store.state, store.dispatch, store),
    ).resolves.toBeUndefined();
  });
});

describe('checkFileExists', () => {
  const doc = createPMNode([], `hello`);
  const wsPath = 'my-ws:test-note.md';

  beforeEach(async () => {
    ({ store } = createBasicTestStore({}));

    await createWorkspace('my-ws', WorkspaceTypeBrowser)(
      store.state,
      store.dispatch,
      store,
    );
    await waitForExpect(() => {
      expect(workspaceSliceKey.getSliceStateAsserted(store.state).wsName).toBe(
        'my-ws',
      );
    });
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
    await setupMockWorkspaceWithNotes(store, 'kujo', [
      ['kujo:one.md', 'hi'],
      ['kujo:two.md', 'bye'],
    ]);

    await refreshWsPaths();

    await waitForExpect(() =>
      expect(
        workspaceSliceKey.getSliceStateAsserted(store.state).wsPaths,
      ).toEqual(['kujo:one.md', 'kujo:two.md']),
    );
  });
});
