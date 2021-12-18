import { BangleEditor } from '@bangle.dev/core';
import { Selection } from '@bangle.dev/pm';

import { AppState } from '@bangle.io/create-store';
import { createPMNode } from '@bangle.io/test-utils/create-pm-node';
import { getScrollParentElement } from '@bangle.io/utils';

import { editorUnmountOp } from '..';
import { editorManagerSlice } from '../editor-manager-slice';
import {
  forEachEditor,
  getEditor,
  getEditorState,
  getInitialSelection,
  onEditorReadyOp,
  someEditorChanged,
} from '../operations';

const getScrollParentElementMock =
  getScrollParentElement as jest.MockedFunction<typeof getScrollParentElement>;

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');
  return {
    ...actual,
    getScrollParentElement: jest.fn(),
  };
});

beforeEach(() => {
  getScrollParentElementMock.mockImplementation(() => undefined);
});

describe('operations: forEachEditor', () => {
  test('works', () => {
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
    expect(getEditor(0)(state)).toBe(editorA);
    expect(getEditor(1)(state)).toBe(editorB);
    expect(getEditor(4)(state)).toBe(undefined);
    expect(getEditor(undefined)(state)).toBe(undefined);
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

    expect(mockCb).toBeCalledTimes(2);

    expect(mockCb).nthCalledWith(1, editorA, 0);
    expect(mockCb).nthCalledWith(2, undefined, 1);
  });
});

describe('operations: getEditorState', () => {
  test('works', () => {
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

  test('undefined editorId', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });

    expect(getEditorState(undefined)(state)).toBe(undefined);
  });
});

describe('onEditorReadyOp', () => {
  let scrollParent = {};
  beforeEach(() => {
    scrollParent = {};
    getScrollParentElementMock.mockImplementation((): any => scrollParent);
  });
  test('does not work on undefined editorId', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });

    let mockEditor = {} as BangleEditor;

    const dispatch = jest.fn();
    onEditorReadyOp(undefined, 'test:one.md', mockEditor)(state, dispatch);

    expect(scrollParent).toEqual({});
    expect(dispatch).toHaveBeenCalledTimes(0);
  });

  test('works', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });

    state = state.applyAction({
      name: 'action::editor-manager-context:update-scroll-position',
      value: { wsPath: 'test:one.md', editorId: 0, scrollPosition: 9 },
    });

    let mockEditor = {} as BangleEditor;

    const dispatch = jest.fn();

    onEditorReadyOp(0, 'test:one.md', mockEditor)(state, dispatch);
    expect(scrollParent).toEqual({
      scrollTop: 9,
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).nthCalledWith(1, {
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: mockEditor,
        editorId: 0,
      },
    });
  });
});

describe('getInitialSelection', () => {
  test('returns selection at docs end if out of range', () => {
    const pmNodeLong = createPMNode(
      [],
      `# hello world
      really long really long really long really long
      really long really long really long really long
      really long really long really long really long
      `.trim(),
    );
    const pmNodeShort = createPMNode(
      [],
      `# hello world
        `.trim(),
    );

    let state = AppState.create({ slices: [editorManagerSlice()] });

    state = state.applyAction({
      name: 'action::editor-manager-context:update-initial-selection-json',
      value: {
        wsPath: 'test:one.md',
        editorId: 0,
        selectionJson: Selection.atEnd(pmNodeLong).toJSON(),
      },
    });

    const selection = getInitialSelection(0, 'test:one.md', pmNodeShort)(state);

    expect(selection?.toJSON()).not.toEqual(
      Selection.atEnd(pmNodeLong).toJSON(),
    );
    expect(selection?.toJSON()).toEqual(Selection.atEnd(pmNodeShort).toJSON());
  });
});

describe('editorUnmountOp', () => {
  test('works 1', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    const editorA = {} as BangleEditor;

    let stateA = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });

    const dispatch = jest.fn();

    editorUnmountOp(0, editorA)(stateA, dispatch);

    expect(dispatch).toBeCalledTimes(1);
    expect(dispatch).nthCalledWith(1, {
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: undefined,
        editorId: 0,
      },
    });
  });

  test('does not unset if editor instance do not match', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    const editorA = {} as BangleEditor;
    const editorB = {} as BangleEditor;

    let stateA = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });

    const dispatch = jest.fn();

    editorUnmountOp(0, editorB)(stateA, dispatch);

    expect(dispatch).toBeCalledTimes(0);
  });
});
describe('someEditorChanged', () => {
  test('works 1', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    const editorA = {} as BangleEditor;
    const editorB = {} as BangleEditor;

    let stateA = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });
    let stateB = stateA.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorB,
        editorId: 1,
      },
    });

    expect(someEditorChanged(stateA)(stateB)).toBe(true);
    expect(someEditorChanged(stateA)(stateA)).toBe(false);
  });

  test('works 2', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });
    const editorA = {} as BangleEditor;
    const editorB = {} as BangleEditor;

    let stateA = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });
    let stateB = stateA.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorB,
        editorId: 0,
      },
    });

    let stateC = stateB.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: editorA,
        editorId: 0,
      },
    });

    expect(someEditorChanged(stateB)(stateC)).toBe(true);
    expect(someEditorChanged(stateA)(stateC)).toBe(false);
  });

  test('works 3', () => {
    let state = AppState.create({ slices: [editorManagerSlice()] });

    let stateA = state.applyAction({
      name: 'action::editor-manager-context:set-editor',
      value: {
        editor: undefined,
        editorId: 0,
      },
    });

    expect(someEditorChanged(state)(stateA)).toBe(false);
    expect(someEditorChanged(stateA)(state)).toBe(false);
  });
});
