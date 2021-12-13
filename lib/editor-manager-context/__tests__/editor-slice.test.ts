import { BangleEditor } from '@bangle.dev/core';

import { ApplicationStore, AppState } from '@bangle.io/create-store';

import {
  editorManagerSlice,
  editorManagerSliceKey,
  forEachEditor,
  getEditorState,
} from '../editor-slice';

jest.mock('../initial-editor-slice-state', () => {
  return {
    initialEditorSliceState: jest.fn(),
  };
});

describe('operations: forEachEditor', () => {
  test('works 1', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    const editorA = {} as BangleEditor;
    const editorB = {} as BangleEditor;

    state = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });
    state = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorB,
        editorId: 1,
      },
    });

    const mockCb = jest.fn();

    forEachEditor(mockCb)(state);

    expect(mockCb).toBeCalledTimes(2);
    expect(mockCb).nthCalledWith(1, editorA, 0);
    expect(mockCb).nthCalledWith(2, editorB, 1);
  });

  test('works 2', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    const editorA = {} as BangleEditor;

    state = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });

    const mockCb = jest.fn();

    forEachEditor(mockCb)(state);

    expect(mockCb).toBeCalledTimes(1);

    expect(mockCb).nthCalledWith(1, editorA, 0);
  });
});

describe('operations: getEditorState', () => {
  test('works 1', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    let value = {};
    state = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: { view: { state: value } } as BangleEditor,
        editorId: 1,
      },
    });

    expect(getEditorState(1)(state)).toBe(value);
    expect(getEditorState(0)(state)).toBe(undefined);
  });

  test('respects destroy 1', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    let value = {};
    state = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: { destroyed: true, view: { state: value } } as BangleEditor,
        editorId: 1,
      },
    });

    expect(getEditorState(1)(state)).toBe(undefined);
  });

  test('undefined editorId', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });

    expect(getEditorState(undefined)(state)).toBe(undefined);
  });
});

describe('editorSlice state', () => {
  let createStore = () =>
    ApplicationStore.create({
      scheduler: (cb) => {
        cb();
        return () => {};
      },
      storeName: 'editor-store',
      state: AppState.create({ slices: [editorManagerSlice()] }),
    });

  describe('SET_EDITOR', () => {
    test('works', () => {
      let mockEditor = {} as BangleEditor;
      let store = createStore();
      store.dispatch({
        name: 'action::editor-manager-context:set-editor',
        value: {
          editor: mockEditor,
          editorId: 0,
        },
      });

      expect(editorManagerSliceKey.getSliceState(store.state)?.editors[0]).toBe(
        mockEditor,
      );

      expect(
        editorManagerSliceKey.getSliceState(store.state)?.primaryEditor,
      ).toBe(mockEditor);

      expect(
        editorManagerSliceKey.getSliceState(store.state)?.secondaryEditor,
      ).toBe(undefined);
    });

    test('replaces editor', () => {
      let mockEditor = {} as BangleEditor;
      let mockEditor2 = {} as BangleEditor;
      let store = createStore();
      store.dispatch({
        name: 'action::editor-manager-context:set-editor',
        value: {
          editor: mockEditor,
          editorId: 0,
        },
      });

      store.dispatch({
        name: 'action::editor-manager-context:set-editor',
        value: {
          editor: mockEditor2,
          editorId: 0,
        },
      });

      expect(editorManagerSliceKey.getSliceState(store.state)?.editors[0]).toBe(
        mockEditor2,
      );

      let mockEditor3 = {} as BangleEditor;

      store.dispatch({
        name: 'action::editor-manager-context:set-editor',
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

  describe('UPDATE_FOCUS', () => {
    test('works', () => {
      let store = createStore();
      store.dispatch({
        name: 'action::editor-manager-context:on-focus-update',
        value: { editorId: 0 },
      });

      expect(
        editorManagerSliceKey.getSliceState(store.state)?.focusedEditorId,
      ).toBe(0);

      store.dispatch({
        name: 'action::editor-manager-context:on-focus-update',
        value: { editorId: 1 },
      });

      expect(
        editorManagerSliceKey.getSliceState(store.state)?.focusedEditorId,
      ).toBe(1);
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
});
