/**
 * @jest-environment @bangle.io/jsdom-env
 */
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { ApplicationStore, AppState } from '@bangle.io/create-store';
import type { JsonObject, JsonPrimitive } from '@bangle.io/shared-types';
import { pageLifeCycleTransitionedTo, pageSlice } from '@bangle.io/slice-page';
import { uiSlice } from '@bangle.io/slice-ui';
import { createEditorFromMd } from '@bangle.io/test-utils';
import {
  getScrollParentElement,
  trimEndWhiteSpaceBeforeCursor,
} from '@bangle.io/utils';

import { FOCUS_EDITOR_ON_LOAD_COOLDOWN } from '../constants';
import {
  editorManagerSlice,
  JSON_SCHEMA_VERSION,
} from '../editor-manager-slice';
import {
  createTestEditor,
  getActionsDispatched,
  getDispatchedAction,
} from './test-utils';

const getScrollParentElementMock =
  getScrollParentElement as jest.MockedFunction<typeof getScrollParentElement>;

jest.mock('@bangle.io/slice-page', () => {
  const actual = jest.requireActual('@bangle.io/slice-page');

  return {
    ...actual,
    pageLifeCycleTransitionedTo: jest.fn(() => {
      return () => false;
    }),
  };
});

jest.mock('@bangle.io/utils', () => {
  const actual = jest.requireActual('@bangle.io/utils');

  return {
    ...actual,
    getScrollParentElement: jest.fn(),
    trimEndWhiteSpaceBeforeCursor: jest.fn(() => () => {}),
    debounceFn: jest.fn((cb) => {
      const foo = () => {
        cb();
      };
      foo.cancel = () => {};

      return foo;
    }),
  };
});

const pageLifeCycleTransitionedToMock =
  pageLifeCycleTransitionedTo as jest.MockedFunction<
    typeof pageLifeCycleTransitionedTo
  >;

beforeEach(() => {
  getScrollParentElementMock.mockImplementation(() => undefined);
  pageLifeCycleTransitionedToMock.mockImplementation(() => () => false);
});

const createStore = (jsonData?: {
  focusedEditorId?: JsonPrimitive;
  editors?: JsonObject;
  editorConfig?: JsonObject;
}) => {
  const store = ApplicationStore.create({
    scheduler: (cb) => {
      let destroyed = false;
      Promise.resolve().then(() => {
        if (!destroyed) {
          cb();
        }
      });

      return () => {
        destroyed = true;
      };
    },
    storeName: 'editor-store',
    state: jsonData
      ? AppState.stateFromJSON<any>({
          slices: [editorManagerSlice(), pageSlice(), uiSlice()],
          json: {
            editorManagerSlice: {
              version: JSON_SCHEMA_VERSION,
              data: jsonData,
            },
          },
          sliceFields: { editorManagerSlice: editorManagerSlice() },
        })
      : AppState.create({
          slices: [
            editorManagerSlice(),
            // @ts-expect-error
            pageSlice(),
            // @ts-expect-error
            uiSlice(),
          ],
        }),
  });

  const dispatchSpy = jest.spyOn(store, 'dispatch');

  return { store, dispatchSpy };
};

describe('focusEditorEffect', () => {
  const dateNow = Date.now;

  beforeEach(() => {
    (Date.now as jest.Mock) = jest.fn(() => 1000);
  });

  afterEach(() => {
    Date.now = dateNow;
  });

  test('focuses on a newly opened editor after cooldown', () => {
    let editor1 = createTestEditor('test:first.md');
    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const { store } = createStore();

    // advance the clock
    (Date.now as jest.Mock).mockImplementation(
      () => FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor1,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy1).toBeCalledTimes(1);

    // advance the clock
    (Date.now as jest.Mock).mockImplementation(
      () => 2 * FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    // try setting another editor at a different editorId
    let editor2 = createTestEditor();
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor2,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('default focus is on the first editor on mount', () => {
    let editor1 = createTestEditor('test:first.md');
    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const { store } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor1,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy1).toBeCalledTimes(1);
  });

  test('does not focus on secondary editor on mount', () => {
    let editor1 = createTestEditor();
    let editor2 = createTestEditor();
    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    const { store } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor1,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy1).toBeCalledTimes(0);

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor2,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    // focuses on the first as it is the default
    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('focuses on a editor if none of the editors are focused', () => {
    let editor1 = createTestEditor();
    let editor2 = createTestEditor();

    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    const { store } = createStore();

    // advance the clock so we can test the default
    // focusing behaviour
    (Date.now as jest.Mock).mockImplementation(
      () => 2 * FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor1,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });
    expect(focusSpy1).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: editor2,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });
    expect(focusSpy2).toBeCalledTimes(1);

    // now try closing the second editor
    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: undefined,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    // the first editor should be called since nothing is focused
    expect(focusSpy1).toBeCalledTimes(2);
    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('does not run focus effect if editors did not change', () => {
    let editor1 = createTestEditor();
    let editor2 = createTestEditor();

    const focusSpy1 = jest.spyOn(editor1, 'focusView');
    const focusSpy2 = jest.spyOn(editor2, 'focusView');
    const { store } = createStore();

    // advance the clock so we can test the default
    // focusing behavior
    (Date.now as jest.Mock).mockImplementation(
      () => 2 * FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    for (let i = 0; i < 5; i++) {
      store.dispatch({
        name: 'action::@bangle.io/slice-editor-manager:set-editor',
        value: {
          editor: editor1,
          editorId: PRIMARY_EDITOR_INDEX,
        },
      });
      store.dispatch({
        name: 'action::@bangle.io/slice-editor-manager:set-editor',
        value: {
          editor: editor2,
          editorId: SECONDARY_EDITOR_INDEX,
        },
      });
    }
    expect(focusSpy1).toBeCalledTimes(1);
    expect(focusSpy2).toBeCalledTimes(1);
  });

  test('sets focus on the correct editor on mount', () => {
    (Date.now as jest.Mock).mockImplementation(() => 1000);

    let mockEditorFirst = createTestEditor();
    let mockEditorSecond = createTestEditor();

    const focusSpy1 = jest.spyOn(mockEditorFirst, 'focusView');
    const focusSpy2 = jest.spyOn(mockEditorSecond, 'focusView');

    const { store } = createStore({
      focusedEditorId: SECONDARY_EDITOR_INDEX,
      editorConfig: {},
    });

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditorFirst,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    // since initial focus is on the second one
    // setting the first editor shouldn't trigger focus
    expect(focusSpy1).toBeCalledTimes(0);
    expect(focusSpy2).toBeCalledTimes(0);

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditorSecond,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy1).toBeCalledTimes(0);
    expect(focusSpy2).toBeCalledTimes(1);

    // Set a new editor at editorId=1
    // and it should not get focused since we are
    // within the cooldown time
    const mockEditor3 = createEditorFromMd('test:third.md');
    const focusSpy3 = jest.spyOn(mockEditor3, 'focusView');

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor3,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    // once initially set no more calls to focus
    // while we are within cooldown time
    expect(focusSpy3).toBeCalledTimes(0);

    // advance the clock
    (Date.now as jest.Mock).mockImplementation(
      () => FOCUS_EDITOR_ON_LOAD_COOLDOWN + 1000 + 1,
    );

    // Set another editor at editorId=1
    // to test if it gets focused or not
    const mockEditor4 = createEditorFromMd('test:fourth.md');
    const focusSpy4 = jest.spyOn(mockEditor4, 'focusView');

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor4,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy1).toBeCalledTimes(0);
    expect(focusSpy2).toBeCalledTimes(1);
    expect(focusSpy3).toBeCalledTimes(0);
    // correctly focuses on the new editor (4th)
    // since cooldown time has elapsed
    expect(focusSpy4).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: undefined,
        editorId: SECONDARY_EDITOR_INDEX,
      },
    });

    expect(focusSpy1).toBeCalledTimes(1);
    expect(focusSpy2).toBeCalledTimes(1);
    expect(focusSpy3).toBeCalledTimes(0);
    expect(focusSpy4).toBeCalledTimes(1);
  });
});

describe('initialSelectionEffect', () => {
  test('works', () => {
    let mockEditor = createEditorFromMd(`# hello world`, {
      pluginMetadata: { wsPath: 'test:first.md' },
    });
    let mockEditor2 = createEditorFromMd(`# bye world`, {
      pluginMetadata: { wsPath: 'test:second.md' },
    });
    let { store, dispatchSpy } = createStore();

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    expect(dispatchSpy).toBeCalledTimes(1);

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor2,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    expect(dispatchSpy).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'action::@bangle.io/slice-editor-manager:update-initial-selection-json',
      value: {
        wsPath: 'test:first.md',
        editorId: PRIMARY_EDITOR_INDEX,
        selectionJson: mockEditor.view.state.selection.toJSON(),
      },
    });

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor2,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    // dispatching the same editor should not call update initialSelection
    expect(
      getDispatchedAction(
        dispatchSpy,
        'action::@bangle.io/slice-editor-manager:update-initial-selection-json',
      ),
    ).toHaveLength(1);
  });
});

describe('watchEditorScrollEffect', () => {
  let origAddEventListener = global.addEventListener;
  let origRemoveEventListener = global.removeEventListener;

  beforeEach(() => {
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
    getScrollParentElementMock.mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.addEventListener = origAddEventListener;
    global.removeEventListener = origRemoveEventListener;
  });

  test('works', () => {
    getScrollParentElementMock.mockImplementation((): any => ({
      scrollTop: 5,
    }));

    let { store, dispatchSpy } = createStore();
    let mockEditor = createEditorFromMd(`# hello world`, {
      pluginMetadata: { wsPath: 'test:first.md' },
    });

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    expect(global.addEventListener).toBeCalledWith(
      'scroll',
      expect.any(Function),
      {
        capture: true,
        passive: true,
      },
    );

    const updateScroll = (global.addEventListener as any).mock.calls[0][1];

    updateScroll();

    expect(getActionsDispatched(dispatchSpy)).toMatchInlineSnapshot(`
      [
        "action::@bangle.io/slice-editor-manager:set-editor",
        "action::@bangle.io/slice-editor-manager:update-scroll-position",
      ]
    `);

    expect(
      getDispatchedAction(
        dispatchSpy,
        'action::@bangle.io/slice-editor-manager:update-scroll-position',
      ),
    ).toEqual([
      {
        id: expect.any(String),
        name: 'action::@bangle.io/slice-editor-manager:update-scroll-position',
        value: {
          editorId: PRIMARY_EDITOR_INDEX,
          scrollPosition: 5,
          wsPath: 'test:first.md',
        },
      },
    ]);

    store?.destroy();

    expect(global.addEventListener).toBeCalledTimes(2);
    expect(global.removeEventListener).toBeCalledTimes(2);
  });
});

describe('trimWhiteSpaceEffect', () => {
  test('works', () => {
    const pageLifeMock = jest.fn(() => true);
    pageLifeCycleTransitionedToMock.mockImplementation((lifecycle) => {
      if (lifecycle?.[0] === 'passive' && lifecycle[1] === 'hidden') {
        return pageLifeMock;
      }

      return () => false;
    });

    const trimMock = jest.fn();
    (trimEndWhiteSpaceBeforeCursor as any).mockImplementation(() => trimMock);

    let { store } = createStore();
    let mockEditor = createTestEditor();

    mockEditor.focusView();

    jest.spyOn(mockEditor.view, 'hasFocus').mockImplementation(() => true);

    store.dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor: mockEditor,
        editorId: PRIMARY_EDITOR_INDEX,
      },
    });

    expect(pageLifeMock).toHaveBeenCalled();
    expect(pageLifeCycleTransitionedToMock).toHaveBeenCalledWith(
      ['passive', 'hidden'],
      expect.anything(),
    );
    expect(trimEndWhiteSpaceBeforeCursor).toBeCalledTimes(1);
    expect(trimMock).toBeCalledTimes(1);
    expect(trimMock).nthCalledWith(
      1,
      mockEditor.view.state,
      mockEditor.view.dispatch,
    );
  });
});
