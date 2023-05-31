import type { BangleEditor } from '@bangle.dev/core';
import type {
  EditorState,
  EditorView,
  Node,
  Transaction,
} from '@bangle.dev/pm';
import { Selection } from '@bangle.dev/pm';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import type { InferSliceName, Store } from '@bangle.io/nsm';
import {
  changeEffect,
  createMetaAction,
  createQueryState,
  createSelector,
  createSliceWithSelectors,
  intervalRunEffect,
  mountEffect,
  Slice,
  sliceStateSerializer,
  StoreState,
  syncChangeEffect,
  updateState,
  z,
} from '@bangle.io/nsm';
import type { EditorIdType } from '@bangle.io/shared-types';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import {
  debounceFn,
  getEditorPluginMetadata,
  getScrollParentElement,
  trimEndWhiteSpaceBeforeCursor,
} from '@bangle.io/utils';

import { initialEditorSliceState } from './constants';
import {
  OpenedEditorsConfig,
  openedEditorsConfigSchema,
} from './opened-editors-config';
import type { EditorSliceState } from './types';
import type { SelectionJson } from './utils';
import {
  assertValidEditorId,
  calculateScrollPosition,
  calculateSelection,
  isValidEditorId,
} from './utils';

const initState: EditorSliceState & {
  // the editor that was last opened
  // the most recent editor id is the first in array
  editorOpenOrder: EditorIdType[];
  disableEditingCounter: number | undefined;
} = {
  ...initialEditorSliceState,
  editorOpenOrder: [],
  disableEditingCounter: undefined,
};

type NsmEditorManagerState = typeof initState;

const updateObj = updateState(initState);

const SLICE_NAME = 'editor-manager-slice';
export const nsmEditorManagerSlice = createSliceWithSelectors([nsmPageSlice], {
  name: SLICE_NAME,
  initState: initState,

  selectors: {
    primaryEditor: createSelector(
      {
        mainEditors: (s) => s.mainEditors,
      },
      (computed) => computed.mainEditors[PRIMARY_EDITOR_INDEX],
    ),
    secondaryEditor: createSelector(
      {
        mainEditors: (s) => s.mainEditors,
      },
      (computed) => computed.mainEditors[SECONDARY_EDITOR_INDEX],
    ),
    lastOpenedEditor: createSelector(
      {
        editorOpenOrder: (s) => s.editorOpenOrder,
        mainEditors: (s) => s.mainEditors,
      },
      (computed) => {
        const lastEditorId = computed.editorOpenOrder[0];
        const lastEditor =
          typeof lastEditorId === 'number'
            ? computed.mainEditors[lastEditorId]
            : undefined;

        return typeof lastEditorId === 'number' && lastEditor
          ? {
              editorId: lastEditorId,
              editor: lastEditor,
            }
          : undefined;
      },
    ),
  },
});

Slice.registerEffectSlice(nsmEditorManagerSlice, [
  mountEffect('watchScrollPos', [nsmEditorManagerSlice], (store) => {
    const updateScrollPos = () => {
      const { mainEditors } = nsmEditorManagerSlice.getState(store.state);
      for (const editor of mainEditors) {
        if (!editor) {
          continue;
        }
        const { editorId, wsPath } = getEditorPluginMetadata(editor.view.state);

        if (editorId == null) {
          return;
        }

        const top = getScrollParentElement(editorId)?.scrollTop;

        if (typeof top !== 'number') {
          return;
        }

        store.dispatch(
          updateScrollPosition({
            editorId,
            scrollPosition: top,
            wsPath,
          }),
        );
      }
    };

    const deb = debounceFn(updateScrollPos, {
      wait: 300,
      maxWait: 600,
    });

    const opts = {
      capture: true,
      passive: true,
    };
    const isWindow = typeof window !== 'undefined';

    if (isWindow) {
      window.addEventListener('scroll', deb, opts);
    }

    return () => {
      deb.cancel();

      if (isWindow) {
        window.removeEventListener('scroll', deb, opts);
      }
    };
  }),

  intervalRunEffect(
    'checkForInactiveEditor',
    [nsmEditorManagerSlice, nsmUISlice],
    // WARNING: do not reduce the interval below 500 as it can prevent manual toggling
    // of editing.
    // WARNING: when changing time, make sure to account for sleep time below
    500,
    (state, dispatch) => {
      let timer: NodeJS.Timeout | undefined;

      if (!nsmUISlice.getState(state).widescreen) {
        const { editingAllowed } = nsmEditorManagerSlice.getState(state);

        if (editingAllowed) {
          timer = setTimeout(() => {
            dispatch(incrementDisableEditingCounter());
          }, 300);
        }
      }

      return () => {
        clearTimeout(timer);
      };
    },
  ),

  // Disable editing when the user is inactive
  changeEffect(
    'toggleEditingEffect',
    {
      disableEditingCounter: nsmEditorManagerSlice.pick(
        (s) => s.disableEditingCounter,
      ),
      isInactivePage: nsmPageSlice.pick((s) => s.isInactivePage),
      widescreen: nsmUISlice.pick((s) => s.widescreen),
      mainEditors: nsmEditorManagerSlice.passivePick((s) => s.mainEditors),
      editingAllowed: nsmEditorManagerSlice.passivePick(
        (s) => s.editingAllowed,
      ),
    },
    (state, dispatch, ref) => {
      if (state.widescreen) {
        return;
      }

      if (state.disableEditingCounter === undefined) {
        return;
      }

      const noEditorInFocus = !someEditor(state.mainEditors, (editor) =>
        editor.view.hasFocus(),
      );

      // TODO this isn't working and is always disabling editor
      // if (noEditorInFocus || state.isInactivePage) {
      //   if (noEditorInFocus) {
      //     console.warn('disabling editing due to no editor in focus');
      //   }
      //   if (state.isInactivePage) {
      //     console.warn('disabling editing due to inactive page');
      //   }
      //   dispatch(
      //     toggleEditingDirect(
      //       {
      //         editingAllowed: state.editingAllowed,
      //         mainEditors: state.mainEditors,
      //       },
      //       { editingAllowed: false },
      //     ),
      //   );
      // }
    },
  ),

  changeEffect(
    'initialSelectionEffect',
    {
      mainEditors: nsmEditorManagerSlice.pick((s) => s.mainEditors),
    },
    ({ mainEditors }, dispatch, ref) => {
      for (const [index, editor] of mainEditors.entries()) {
        if (!editor) {
          continue;
        }
        const value = calculateSelection(index, editor);
        dispatch(updateSelection(value));
      }
    },
  ),

  changeEffect(
    'trimWhiteSpaceEffect',
    {
      mainEditors: nsmEditorManagerSlice.passivePick((s) => s.mainEditors),
      isInactivePage: nsmPageSlice.pick((s) => s.isInactivePage),
    },
    ({ mainEditors, isInactivePage }) => {
      if (isInactivePage) {
        for (const editor of mainEditors) {
          if (!editor) {
            continue;
          }
          trimEndWhiteSpaceBeforeCursor()(
            editor.view.state,
            editor.view.dispatch,
          );
        }
      }
    },
  ),

  // This effect does:
  // 1. Focus on the correct editor on initial mount.
  // 2. Automatically focus on any new mounted editor thereafter.
  // 3. If no current editor has any focus, focus on one automatically.
  syncChangeEffect(
    'focusEffect',
    {
      lastOpenedEditor: nsmEditorManagerSlice.pick((s) => s.lastOpenedEditor),
      focusedEditorId: nsmEditorManagerSlice.passivePick(
        (s) => s.focusedEditorId,
      ),
      mainEditors: nsmEditorManagerSlice.passivePick((s) => s.mainEditors),
      primaryWsPath: nsmPageSlice.passivePick((s) => s.primaryWsPath),
      secondaryWsPath: nsmPageSlice.passivePick((s) => s.secondaryWsPath),
    },
    (
      {
        lastOpenedEditor,
        focusedEditorId,
        mainEditors,
        primaryWsPath,
        secondaryWsPath,
      },
      _,
      ref: { focusedOnMount?: boolean },
    ) => {
      // no point in focusing if we don't have any editors
      if (primaryWsPath == null && secondaryWsPath == null) {
        return;
      }

      const isPrimaryReady = Boolean(
        primaryWsPath ? mainEditors[PRIMARY_EDITOR_INDEX] : true,
      );

      const isSecondaryReady = Boolean(
        secondaryWsPath ? mainEditors[SECONDARY_EDITOR_INDEX] : true,
      );

      if (!isPrimaryReady && !isSecondaryReady) {
        return;
      }

      // if we have already focused on mount, then we can continue focusing
      // on the last opened editor
      if (ref.focusedOnMount) {
        lastOpenedEditor?.editor.focusView();

        return;
      }

      if (isPrimaryReady && isSecondaryReady) {
        ref.focusedOnMount = true;

        if (typeof focusedEditorId === 'number') {
          // if mounting for the first time, focus on the focusedEditorId
          mainEditors[focusedEditorId]?.focusView();
        } else {
          lastOpenedEditor?.editor.focusView();
        }
      }
    },
  ),
]);

type EditorManagerStoreState = StoreState<
  InferSliceName<typeof nsmEditorManagerSlice>
>;
type EditorManagerStoreDispatch = Store<
  InferSliceName<typeof nsmEditorManagerSlice>
>['dispatch'];

export const noOp = nsmEditorManagerSlice.createAction('noOp', () => {
  return (state) => {
    return state;
  };
});

export const setEditingAllowed = nsmEditorManagerSlice.createAction(
  'setEditingAllowed',
  ({ editingAllowed }: { editingAllowed: boolean }) => {
    return (state) =>
      updateObj(state, {
        editingAllowed,
      });
  },
);

export const setEditor = nsmEditorManagerSlice.createAction(
  'setEditor',
  ({
    editorId,
    editor,
  }: {
    editor: BangleEditor | undefined;
    editorId: EditorIdType;
  }) => {
    return (state) => {
      if (!isValidEditorId(editorId)) {
        return state;
      }

      const newEditors: EditorSliceState['mainEditors'] = [
        ...state.mainEditors,
      ];
      newEditors[editorId] = editor;

      const editorOpenOrder = [editorId, ...state.editorOpenOrder].filter(
        (index) => {
          return Boolean(newEditors[index]);
        },
      );

      return updateObj(state, {
        mainEditors: newEditors,
        editorOpenOrder,
      });
    };
  },
);

// when editors focus changes sync with state
export const onFocusUpdate = nsmEditorManagerSlice.createAction(
  'onFocusUpdate',
  ({ editorId }: { editorId: EditorIdType }) => {
    return (state) => {
      if (!isValidEditorId(editorId)) {
        return state;
      }

      console.warn({ editorId });

      return updateObj(state, {
        focusedEditorId: editorId,
      });
    };
  },
);

export const updateScrollPosition = nsmEditorManagerSlice.createAction(
  'updateScrollPosition',
  ({
    editorId,
    wsPath,
    scrollPosition,
  }: {
    editorId: EditorIdType;
    wsPath: string;
    scrollPosition: number;
  }) => {
    return (state) => {
      if (!isValidEditorId(editorId)) {
        return state;
      }

      const newEditorConfig = state.editorConfig.updateScrollPosition(
        scrollPosition,
        wsPath,
        editorId,
      );

      return updateObj(state, {
        editorConfig: newEditorConfig,
      });
    };
  },
);

export const incrementDisableEditingCounter =
  nsmEditorManagerSlice.createAction('incrementDisableEditingCounter', () => {
    return (state) => {
      return updateObj(state, {
        disableEditingCounter: (state.disableEditingCounter || 0) + 1,
      });
    };
  });

export const updateSelection = nsmEditorManagerSlice.createAction(
  'updateSelection',
  ({
    editorId,
    wsPath,
    selectionJson,
  }: {
    editorId: EditorIdType;
    wsPath: string;
    selectionJson: SelectionJson;
  }) => {
    return (state) => {
      if (!isValidEditorId(editorId)) {
        return state;
      }

      const newEditorConfig = state.editorConfig.updateSelection(
        selectionJson,
        wsPath,
        editorId,
      );

      return updateObj(state, {
        editorConfig: newEditorConfig,
      });
    };
  },
);

export const setEditorScrollPos = createQueryState(
  [nsmEditorManagerSlice],
  (state: EditorManagerStoreState, wsPath: string, editorId: EditorIdType) => {
    const scrollParent = getScrollParentElement(editorId);
    const editorConfig = nsmEditorManagerSlice.getState(state).editorConfig;
    const pos = editorConfig.getScrollPosition(wsPath, editorId);

    if (typeof pos === 'number' && scrollParent) {
      scrollParent.scrollTop = pos;
    }
  },
);

export const focusEditorIfNotFocused = createQueryState(
  [nsmEditorManagerSlice],
  (state, editorId?: EditorIdType) => {
    if (querySomeEditor(state, (editor) => editor.view.hasFocus())) {
      return;
    }

    if (editorId != null) {
      const editor = getEditor(state, editorId);

      if (editor) {
        editor.focusView();

        return;
      }
    }

    nsmEditorManagerSlice
      .resolveState(state)
      .lastOpenedEditor?.editor?.focusView();
  },
);

export const getEditor = createQueryState(
  [nsmEditorManagerSlice],
  (
    state: EditorManagerStoreState,
    editorId: EditorIdType,
  ): BangleEditor | undefined => {
    assertValidEditorId(editorId);

    const sliceState = nsmEditorManagerSlice.getState(state);

    return sliceState.mainEditors[editorId];
  },
);

export const getInitialSelection = createQueryState(
  [nsmEditorManagerSlice],
  (
    state: EditorManagerStoreState,
    editorId: EditorIdType,
    wsPath: string,
    doc: Node,
  ) => {
    assertValidEditorId(editorId);

    const sliceState = nsmEditorManagerSlice.getState(state);

    if (!sliceState) {
      return undefined;
    }

    const initialSelection = sliceState.editorConfig.getSelection(
      wsPath,
      editorId,
    );

    if (initialSelection) {
      const anchor =
        typeof initialSelection?.anchor === 'number'
          ? initialSelection.anchor
          : undefined;

      const head =
        typeof initialSelection?.head === 'number'
          ? initialSelection.head
          : undefined;

      let isOutside = false;

      if (anchor != null && head != null) {
        isOutside = Math.max(anchor, head) >= doc.content.size;
      }

      let selection = isOutside
        ? Selection.atEnd(doc)
        : safeSelectionFromJSON(doc, initialSelection);
      let { from } = selection;

      if (from >= doc.content.size) {
        selection = Selection.atEnd(doc);
      } else {
        selection = Selection.near(doc.resolve(from));
      }

      return selection;
    }

    return undefined;
  },
);

/**
 * Enables or disables editing.
 *
 * @param param0.focusOrBlur - if true : focuses when enabling editing, blurs when disabling editing
 * @returns
 */
export const toggleEditing = createMetaAction(
  [nsmEditorManagerSlice],
  (
    state,
    {
      focusOrBlur = true,
      editingAllowed,
    }: { focusOrBlur?: boolean; editingAllowed?: boolean } = {},
  ) => {
    const sliceState = nsmEditorManagerSlice.getState(state);

    return toggleEditingDirect(sliceState, {
      focusOrBlur,
      editingAllowed,
    });
  },
);

export function toggleEditingDirect(
  sliceState: {
    editingAllowed: EditorSliceState['editingAllowed'];
    mainEditors: EditorSliceState['mainEditors'];
  },
  {
    focusOrBlur = true,
    editingAllowed,
  }: { focusOrBlur?: boolean; editingAllowed?: boolean } = {},
) {
  const newEditingAllowed = editingAllowed ?? !sliceState.editingAllowed;

  if (!focusOrBlur) {
    return noOp();
  }

  for (const editor of sliceState.mainEditors) {
    if (editor?.view.isDestroyed) {
      continue;
    }

    if (newEditingAllowed) {
      editor?.focusView();
    } else {
      editor?.view.dom.blur();
    }

    // send empty transaction so that editor view can update
    // the editing state.
    // queue it up so it is dispatched after store updated, so that
    // when editor queries the state, the state is correct.
    queueMicrotask(() => {
      editor?.view.dispatch(
        editor.view.state.tr.setMeta('__activitybar_empty__', true),
      );
    });
  }

  return setEditingAllowed({
    editingAllowed: newEditingAllowed,
  });
}

function safeSelectionFromJSON(doc: Node, json: any) {
  try {
    // this can throw error if invalid json is passed
    // since we donot control the json we need swallow the error
    return Selection.fromJSON(doc, json);
  } catch (error) {
    if (error instanceof RangeError) {
      return Selection.atStart(doc);
    }
    throw error;
  }
}

export function dispatchEditorCommand<T>(
  state: EditorManagerStoreState,
  editorId: EditorIdType,
  cmdCallback: (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => T,
): T | false {
  assertValidEditorId(editorId);

  const currentEditor = getEditor(state, editorId);

  if (!currentEditor) {
    return false;
  }

  const view = currentEditor.view;

  return cmdCallback(view.state, view.dispatch, view);
}

export function forEachEditorPlain(
  state: EditorManagerStoreState | NsmEditorManagerState,
  callback: (editor: BangleEditor, editorId: EditorIdType) => void,
) {
  const { mainEditors } =
    state instanceof StoreState ? nsmEditorManagerSlice.getState(state) : state;

  for (const [editorId, editor] of mainEditors.entries()) {
    if (editor) {
      callback(editor, editorId);
    }
  }
}
export const forEachEditor = createQueryState(
  [nsmEditorManagerSlice],
  (state, callback: (editor: BangleEditor, editorId: EditorIdType) => void) => {
    const { mainEditors } = nsmEditorManagerSlice.getState(state);

    for (const [editorId, editor] of mainEditors.entries()) {
      if (editor) {
        callback(editor, editorId);
      }
    }
  },
);

const SERIAL_VERSION = 1;

export const persistState = sliceStateSerializer(nsmEditorManagerSlice, {
  dbKey: 'editorManagerSlice',
  schema: z.object({
    focusedEditorId: z.union([z.number(), z.undefined()]),
    editorConfig: openedEditorsConfigSchema,
  }),
  serialize: (state) => {
    const { editorConfig, focusedEditorId } =
      nsmEditorManagerSlice.resolveState(state);

    let newEditorConfig = editorConfig;

    forEachEditor(state, (editor, editorId) => {
      const { selectionJson, wsPath } = calculateSelection(editorId, editor);

      const scroll = calculateScrollPosition(
        editorId,
        editor.view,
      )?.scrollPosition;

      newEditorConfig = newEditorConfig.updateSelection(
        selectionJson,
        wsPath,
        editorId,
      );
      newEditorConfig = newEditorConfig.updateScrollPosition(
        scroll,
        wsPath,
        editorId,
      );
    });

    return {
      version: SERIAL_VERSION,
      data: {
        focusedEditorId: focusedEditorId,
        editorConfig: newEditorConfig.toJsonObj(),
      },
    };
  },

  deserialize: ({ version, data }) => {
    if (version < SERIAL_VERSION) {
      return initState;
    }

    return updateObj(initState, {
      focusedEditorId: data.focusedEditorId,
      editorConfig: OpenedEditorsConfig.fromJsonObj(data.editorConfig),
    });
  },
});

function querySomeEditor(
  state: EditorManagerStoreState,
  callback: (editor: BangleEditor, editorId: EditorIdType) => boolean,
): boolean {
  const sliceState = nsmEditorManagerSlice.getState(state);

  return someEditor(sliceState.mainEditors, callback);
}

function someEditor(
  mainEditors: EditorSliceState['mainEditors'],
  callback: (editor: BangleEditor, editorId: EditorIdType) => boolean,
): boolean {
  return Array.from(mainEditors.entries()).some(([editorId, editor]) =>
    editor ? callback(editor, editorId) : false,
  );
}
