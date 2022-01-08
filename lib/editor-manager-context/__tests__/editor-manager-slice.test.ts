import { Selection } from '@bangle.dev/pm';

import { ApplicationStore, AppState } from '@bangle.io/create-store';
import { createPMNode } from '@bangle.io/test-utils/create-pm-node';
import { getScrollParentElement } from '@bangle.io/utils';

import { geEditorScrollPosition, getInitialSelection } from '..';
import { editorManagerSliceKey } from '../constants';
import { editorManagerSlice } from '../editor-manager-slice';
import { getEditor } from '../operations';
import { createTestEditor } from './test-utils';

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');
  return {
    ...actual,
    getScrollParentElement: jest.fn(() => {
      return undefined;
    }),
  };
});

let createStore = () =>
  ApplicationStore.create({
    scheduler: (cb) => {
      cb();
      return () => {};
    },
    storeName: 'editor-store',
    state: AppState.create({ slices: [editorManagerSlice()] }),
  });

describe('set editor action', () => {
  test('works', () => {
    let mockEditor = createTestEditor();
    let store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    expect(getEditor(0)(store.state)).toBe(mockEditor);

    expect(
      editorManagerSliceKey.getSliceState(store.state)?.primaryEditor,
    ).toBe(mockEditor);

    expect(
      editorManagerSliceKey.getSliceState(store.state)?.secondaryEditor,
    ).toBe(undefined);
  });

  test('setting out of range editorId', () => {
    let mockEditor = createTestEditor();
    let store = createStore();
    expect(() =>
      store.dispatch({
        name: 'action::@bangle.io/editor-manager-context:set-editor',
        value: {
          editor: mockEditor,
          editorId: 10000,
        },
      }),
    ).toThrowError('editorId is out of range');
  });

  test('replacing editor', () => {
    let mockEditor = createTestEditor('test:first.md');
    let mockEditor2 = createTestEditor('test:second.md');

    let store = createStore();

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor2,
        editorId: 0,
      },
    });

    expect(getEditor(0)(store.state)).toBe(mockEditor2);

    let mockEditor3 = createTestEditor('test:third.md');

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor3,
        editorId: 1,
      },
    });

    expect(
      editorManagerSliceKey.getSliceState(store.state)?.primaryEditor,
    ).toBe(mockEditor2);
    expect(
      editorManagerSliceKey.getSliceState(store.state)?.secondaryEditor,
    ).toBe(mockEditor3);
  });
});

describe('update focus action', () => {
  test('works', () => {
    let store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:on-focus-update',
      value: { editorId: 0 },
    });

    expect(
      editorManagerSliceKey.getSliceState(store.state)?.focusedEditorId,
    ).toBe(0);

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:on-focus-update',
      value: { editorId: 1 },
    });

    expect(
      editorManagerSliceKey.getSliceState(store.state)?.focusedEditorId,
    ).toBe(1);
  });

  test('throws error for out of bound editorId', () => {
    let store = createStore();
    expect(() => {
      store.dispatch({
        name: 'action::@bangle.io/editor-manager-context:on-focus-update',
        value: { editorId: 1000000 },
      });
    }).toThrowError('editorId is out of range');
  });
});

describe('setting scroll position', () => {
  test('works', () => {
    let store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-scroll-position',
      value: { wsPath: 'test:one.md', editorId: 0, scrollPosition: 9 },
    });

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toBe(9);

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-scroll-position',
      value: { wsPath: 'test:one.md', editorId: 1, scrollPosition: 199 },
    });

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toBe(9);
    expect(geEditorScrollPosition(1, 'test:one.md')(store.state)).toBe(199);

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-scroll-position',
      value: { wsPath: 'test:two.md', editorId: 1, scrollPosition: 299 },
    });

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toBe(9);
    expect(geEditorScrollPosition(1, 'test:one.md')(store.state)).toBe(199);
    expect(geEditorScrollPosition(1, 'test:two.md')(store.state)).toBe(299);

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-scroll-position',
      value: { wsPath: 'test:one.md', editorId: 0, scrollPosition: 8 },
    });

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toBe(8);
    expect(geEditorScrollPosition(1, 'test:one.md')(store.state)).toBe(199);
    expect(geEditorScrollPosition(1, 'test:two.md')(store.state)).toBe(299);
  });

  test('getting non existent', () => {
    let store = createStore();

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toBe(
      undefined,
    );

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-scroll-position',
      value: { wsPath: 'test:one.md', editorId: 0, scrollPosition: 9 },
    });

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toBe(9);
    expect(geEditorScrollPosition(1, 'test:one.md')(store.state)).toBe(
      undefined,
    );
    expect(geEditorScrollPosition(0, 'test:two.md')(store.state)).toBe(
      undefined,
    );
  });
});

describe('setting selectionJson', () => {
  const pmNode = createPMNode(
    [],
    `
# Hello
- World
    `.trim(),
  );

  test('works', () => {
    let store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(0)).toJSON(),
      },
    });

    expect(getInitialSelection(0, 'test:one.md', pmNode)(store.state))
      .toMatchInlineSnapshot(`
        Object {
          "anchor": 1,
          "head": 1,
          "type": "text",
        }
      `);

    expect(
      getInitialSelection(
        0,
        'test:one.md',
        pmNode,
      )(store.state)?.eq(Selection.near(pmNode.resolve(0))),
    ).toBe(true);

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(1)).toJSON(),
      },
    });

    expect(
      getInitialSelection(
        0,
        'test:one.md',
        pmNode,
      )(store.state)?.eq(Selection.near(pmNode.resolve(1))),
    ).toBe(true);

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:two.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(11)).toJSON(),
      },
    });

    expect(
      getInitialSelection(
        0,
        'test:two.md',
        pmNode,
      )(store.state)?.eq(Selection.near(pmNode.resolve(11))),
    ).toEqual(true);
  });

  test('getting non existent', () => {
    let store = createStore();

    expect(getInitialSelection(0, 'test:one.md', pmNode)(store.state)).toBe(
      undefined,
    );

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(11)).toJSON(),
      },
    });

    expect(
      getInitialSelection(
        0,
        'test:one.md',
        pmNode,
      )(store.state)?.eq(Selection.near(pmNode.resolve(11))),
    ).toBe(true);
    expect(getInitialSelection(1, 'test:one.md', pmNode)(store.state)).toBe(
      undefined,
    );
    expect(getInitialSelection(0, 'test:two.md', pmNode)(store.state)).toBe(
      undefined,
    );
  });
});

describe('any other action', () => {
  test('works', () => {
    let store = createStore();
    const prevState = editorManagerSliceKey.getSliceState(store.state);
    store.dispatch({
      name: 'some other action' as any,
      value: { editorId: 0 },
    });

    expect(editorManagerSliceKey.getSliceState(store.state)).toBe(prevState);
  });
});

describe('serializing state', () => {
  const pmNode = createPMNode(
    [],
    `
# Hello
- World
  `.trim(),
  );

  test('selection is serialized correctly', () => {
    let store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(5)).toJSON(),
      },
    });

    expect(
      getInitialSelection(0, 'test:one.md', pmNode)(store.state)?.toJSON(),
    ).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });

    const json: any = store.state.stateToJSON({
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    expect(json.editorManagerSlice.data.editorConfig.selections).toEqual([
      { 'test:one.md': Selection.near(pmNode.resolve(5)).toJSON() },
      null,
    ]);

    expect(json).toMatchSnapshot();

    const newState = AppState.stateFromJSON({
      slices: [editorManagerSlice()],
      json,
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    expect(
      getInitialSelection(0, 'test:one.md', pmNode)(newState)?.toJSON(),
    ).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });
  });

  test('handles schema version mismatch', () => {
    let store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(5)).toJSON(),
      },
    });

    expect(
      getInitialSelection(0, 'test:one.md', pmNode)(store.state)?.toJSON(),
    ).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });

    const json: any = store.state.stateToJSON({
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    json.editorManagerSlice.version = 'some-other-version';

    const newState = AppState.stateFromJSON({
      slices: [editorManagerSlice()],
      json,
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    expect(
      getInitialSelection(0, 'test:one.md', pmNode)(newState)?.toJSON(),
    ).toBe(undefined);
  });

  test('saves current editor selection correctly', () => {
    let mockEditor = createTestEditor();

    let tr = mockEditor.view.state.tr;

    mockEditor.view.dispatch(
      tr.setSelection(Selection.near(tr.doc.resolve(7))),
    );

    const store = createStore();

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    const json: any = store.state.stateToJSON({
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    expect(json.editorManagerSlice.data.editorConfig.selections)
      .toMatchInlineSnapshot(`
        Array [
          Object {
            "test:first.md": Object {
              "anchor": 7,
              "head": 7,
              "type": "text",
            },
          },
          null,
        ]
      `);
  });

  test('overwrites pre-existing scroll position when serializing', () => {
    let mockEditor = createTestEditor('test:one.md', `# hello world`);

    (getScrollParentElement as any).mockImplementation((): any => ({
      scrollTop: 5,
    }));

    const store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-scroll-position',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        scrollPosition: 2,
      },
    });

    expect(geEditorScrollPosition(0, 'test:one.md')(store.state)).toEqual(2);

    const json: any = store.state.stateToJSON({
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    const newState = AppState.stateFromJSON({
      slices: [editorManagerSlice()],
      json,
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    // should pick up the latest position
    expect(geEditorScrollPosition(0, 'test:one.md')(newState)).toEqual(5);
  });

  test('overwrites pre-existing selections when serializing', () => {
    let mockEditor = createTestEditor('test:one.md', `# hello world`);
    const store = createStore();
    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.near(pmNode.resolve(5)).toJSON(),
      },
    });

    expect(
      getInitialSelection(0, 'test:one.md', pmNode)(store.state)?.toJSON(),
    ).toEqual({
      anchor: 5,
      head: 5,
      type: 'text',
    });

    let tr = mockEditor.view.state.tr;

    mockEditor.view.dispatch(
      tr.setSelection(Selection.near(tr.doc.resolve(2))),
    );

    store.dispatch({
      name: 'action::@bangle.io/editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });

    const json: any = store.state.stateToJSON({
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    const newState = AppState.stateFromJSON({
      slices: [editorManagerSlice()],
      json,
      sliceFields: { editorManagerSlice: editorManagerSlice() },
    });

    expect(
      getInitialSelection(0, 'test:one.md', pmNode)(newState)?.toJSON(),
    ).toEqual(Selection.near(pmNode.resolve(2)).toJSON());
  });
});
