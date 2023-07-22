import type { BangleEditor } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import { Selection } from '@bangle.dev/pm';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import type { InferSliceNameFromSlice } from '@bangle.io/nsm-3';
import {
  cleanup,
  effect,
  operation,
  ref,
  sliceKey,
  sliceStateSerializer,
  z,
} from '@bangle.io/nsm-3';
import type { EditorIdType } from '@bangle.io/shared-types';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import {
  debounceFn,
  getEditorPluginMetadata,
  getScrollParentElement,
  shallowEqual,
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

export const nsmEditorManagerSliceKey = sliceKey([nsmPageSlice], {
  name: 'editor-manager-slice',
  state: initState,
});

const primaryEditor = nsmEditorManagerSliceKey.selector((storeState) => {
  const { mainEditors } = nsmEditorManagerSliceKey.get(storeState);

  return mainEditors[PRIMARY_EDITOR_INDEX];
});

const secondaryEditor = nsmEditorManagerSliceKey.selector((storeState) => {
  const { mainEditors } = nsmEditorManagerSliceKey.get(storeState);

  return mainEditors[SECONDARY_EDITOR_INDEX];
});

const lastOpenedEditor = nsmEditorManagerSliceKey.selector(
  (storeState) => {
    const { editorOpenOrder, mainEditors } =
      nsmEditorManagerSliceKey.get(storeState);
    const lastEditorId = editorOpenOrder[0];
    const lastEditor =
      typeof lastEditorId === 'number' ? mainEditors[lastEditorId] : undefined;

    return typeof lastEditorId === 'number' && lastEditor
      ? {
          editorId: lastEditorId,
          editor: lastEditor,
        }
      : undefined;
  },
  {
    equal: shallowEqual,
  },
);

export const nsmEditorManagerSlice = nsmEditorManagerSliceKey.slice({
  derivedState: {
    primaryEditor,
    secondaryEditor,
    lastOpenedEditor,
  },
});

const watchScrollPos = effect(function watchScrollPos(store) {
  const updateScrollPos = () => {
    const { mainEditors } = nsmEditorManagerSlice.get(store.state);
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

  cleanup(store, () => {
    deb.cancel();

    if (isWindow) {
      window.removeEventListener('scroll', deb, opts);
    }
  });
});

const checkForInactiveEditor = effect(function checkForInactiveEditor(store) {
  let timer: NodeJS.Timeout | undefined;
  const intervalId = setInterval(
    () => {
      if (timer) {
        clearTimeout(timer);
      }

      if (!nsmUISlice.get(store.state).widescreen) {
        const { editingAllowed } = nsmEditorManagerSlice.get(store.state);

        if (editingAllowed) {
          timer = setTimeout(() => {
            store.dispatch(incrementDisableEditingCounter());
          }, 300);
        }
      }
    },
    // WARNING: do not reduce the interval below 500 as it can prevent manual toggling
    // of editing.
    // WARNING: when changing time, make sure to account for sleep time below
    500,
  );

  cleanup(store, () => {
    if (timer) {
      clearTimeout(timer);
    }
    clearInterval(intervalId);
  });
});

const toggleEditingEffect = effect(function toggleEditingEffect(store) {
  void nsmPageSlice.track(store).isInactivePage;

  const { disableEditingCounter } = nsmEditorManagerSlice.track(store);
  const { widescreen } = nsmUISlice.track(store);

  const { mainEditors, editingAllowed } = nsmEditorManagerSlice.get(
    store.state,
  );

  if (widescreen || disableEditingCounter === undefined) {
    return;
  }

  const noEditorInFocus = !someEditor(mainEditors, (editor) =>
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
});

const initialSelectionEffect = effect(function initialSelectionEffect(store) {
  const { mainEditors } = nsmEditorManagerSlice.track(store);

  for (const [index, editor] of mainEditors.entries()) {
    if (!editor) {
      continue;
    }
    const value = calculateSelection(index, editor);
    store.dispatch(updateSelection(value));
  }
});

const trimWhiteSpaceEffect = effect(function trimWhiteSpaceEffect(store) {
  const { mainEditors } = nsmEditorManagerSlice.get(store.state);
  const { isInactivePage } = nsmPageSlice.track(store);

  if (isInactivePage) {
    for (const editor of mainEditors) {
      if (!editor) {
        continue;
      }
      trimEndWhiteSpaceBeforeCursor()(editor.view.state, editor.view.dispatch);
    }
  }
});

const getFocusedOnMountRef = ref(() => ({
  focusedOnMount: false,
}));

// This effect does:
// 1. Focus on the correct editor on initial mount.
// 2. Automatically focus on any new mounted editor thereafter.
// 3. If no current editor has any focus, focus on one automatically.
const focusEffect = effect(
  function focusEffect(store) {
    const { lastOpenedEditor } = nsmEditorManagerSlice.track(store);

    const { focusedEditorId, mainEditors } = nsmEditorManagerSlice.get(
      store.state,
    );
    const { primaryWsPath, secondaryWsPath } = nsmPageSlice.get(store.state);

    const focusedRef = getFocusedOnMountRef(store);

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
    if (focusedRef.current.focusedOnMount) {
      lastOpenedEditor?.editor.focusView();

      return;
    }

    if (isPrimaryReady && isSecondaryReady) {
      focusedRef.current.focusedOnMount = true;

      if (typeof focusedEditorId === 'number') {
        // if mounting for the first time, focus on the focusedEditorId
        mainEditors[focusedEditorId]?.focusView();
      } else {
        lastOpenedEditor?.editor.focusView();
      }
    }
  },
  { deferred: false },
);

export const nsmEditorEffects = [
  watchScrollPos,
  checkForInactiveEditor,
  toggleEditingEffect,
  initialSelectionEffect,
  trimWhiteSpaceEffect,
  focusEffect,
];

export const noOp = nsmEditorManagerSlice.action(function noOp() {
  return nsmEditorManagerSlice.tx((state) => {
    return nsmEditorManagerSlice.update(state, (sliceState) => {
      return sliceState;
    });
  });
});

export const setEditingAllowed = nsmEditorManagerSlice.action(
  function setEditingAllowed({ editingAllowed }: { editingAllowed: boolean }) {
    return nsmEditorManagerSlice.tx((state) => {
      return nsmEditorManagerSlice.update(state, {
        editingAllowed,
      });
    });
  },
);

export const setEditor = nsmEditorManagerSlice.action(function setEditor({
  editorId,
  editor,
}: {
  editor: BangleEditor | undefined;
  editorId: EditorIdType;
}) {
  return nsmEditorManagerSlice.tx((state) => {
    return nsmEditorManagerSlice.update(state, (sliceState) => {
      if (!isValidEditorId(editorId)) {
        return sliceState;
      }

      const newEditors: EditorSliceState['mainEditors'] = [
        ...sliceState.mainEditors,
      ];
      newEditors[editorId] = editor;

      const editorOpenOrder = [editorId, ...sliceState.editorOpenOrder].filter(
        (index) => {
          return Boolean(newEditors[index]);
        },
      );

      return {
        mainEditors: newEditors,
        editorOpenOrder,
      };
    });
  });
});

export const onFocusUpdate = nsmEditorManagerSlice.action(
  function onFocusUpdate({ editorId }: { editorId: EditorIdType }) {
    return nsmEditorManagerSlice.tx((state) => {
      return nsmEditorManagerSlice.update(state, (sliceState) => {
        if (!isValidEditorId(editorId)) {
          return sliceState;
        }

        return {
          focusedEditorId: editorId,
        };
      });
    });
  },
);

export const updateScrollPosition = nsmEditorManagerSlice.action(
  function updateScrollPosition({
    editorId,
    wsPath,
    scrollPosition,
  }: {
    editorId: EditorIdType;
    wsPath: string;
    scrollPosition: number;
  }) {
    return nsmEditorManagerSlice.tx((state) => {
      return nsmEditorManagerSlice.update(state, (sliceState) => {
        if (!isValidEditorId(editorId)) {
          return sliceState;
        }

        const newEditorConfig = sliceState.editorConfig.updateScrollPosition(
          scrollPosition,
          wsPath,
          editorId,
        );

        return {
          editorConfig: newEditorConfig,
        };
      });
    });
  },
);

export const incrementDisableEditingCounter = nsmEditorManagerSlice.action(
  function incrementDisableEditingCounter() {
    return nsmEditorManagerSlice.tx((state) => {
      return nsmEditorManagerSlice.update(state, (sliceState) => {
        return {
          disableEditingCounter: (sliceState.disableEditingCounter || 0) + 1,
        };
      });
    });
  },
);

export const updateSelection = nsmEditorManagerSlice.action(
  function updateSelection({
    editorId,
    wsPath,
    selectionJson,
  }: {
    editorId: EditorIdType;
    wsPath: string;
    selectionJson: SelectionJson;
  }) {
    return nsmEditorManagerSlice.tx((state) => {
      if (!isValidEditorId(editorId)) {
        return nsmEditorManagerSlice.get(state);
      }

      return nsmEditorManagerSlice.update(state, (sliceState) => {
        const newEditorConfig = sliceState.editorConfig.updateSelection(
          selectionJson,
          wsPath,
          editorId,
        );

        return {
          editorConfig: newEditorConfig,
        };
      });
    });
  },
);

export const setEditorScrollPos = nsmEditorManagerSlice.query(
  (wsPath: string, editorId: EditorIdType) => {
    return (state) => {
      const scrollParent = getScrollParentElement(editorId);
      const editorConfig = nsmEditorManagerSlice.get(state).editorConfig;
      const pos = editorConfig.getScrollPosition(wsPath, editorId);

      if (typeof pos === 'number' && scrollParent) {
        scrollParent.scrollTop = pos;
      }
    };
  },
);

export const focusEditorIfNotFocused = nsmEditorManagerSlice.query(
  (editorId?: EditorIdType) => (state) => {
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

    nsmEditorManagerSlice.get(state).lastOpenedEditor?.editor?.focusView();
  },
);

export const getEditor = nsmEditorManagerSlice.query(
  (editorId: EditorIdType) => {
    return (state) => {
      assertValidEditorId(editorId);

      const sliceState = nsmEditorManagerSlice.get(state);

      return sliceState.mainEditors[editorId];
    };
  },
);

export const getInitialSelection = nsmEditorManagerSlice.query(
  (editorId: EditorIdType, wsPath: string, doc: Node) => {
    return (state) => {
      assertValidEditorId(editorId);

      const sliceState = nsmEditorManagerSlice.get(state);

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
    };
  },
);

const editorOperations = operation<
  InferSliceNameFromSlice<typeof nsmEditorManagerSlice>
>({});

/**
 * Enables or disables editing.
 *
 * @param param0.focusOrBlur - if true : focuses when enabling editing, blurs when disabling editing
 * @returns
 */
export const toggleEditing = nsmEditorManagerSlice.action(
  ({
    focusOrBlur = true,
    editingAllowed,
  }: { focusOrBlur?: boolean; editingAllowed?: boolean } = {}) => {
    return nsmEditorManagerSlice.tx((storeState) => {
      if (!focusOrBlur) {
        // NOOP
        return nsmEditorManagerSlice.get(storeState);
      }

      return nsmEditorManagerSlice.update(storeState, (sliceState) => {
        const newEditingAllowed = editingAllowed ?? !sliceState.editingAllowed;

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

        return {
          editingAllowed: newEditingAllowed,
        };
      });
    });
  },
);

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

export const forEachEditor = nsmEditorManagerSlice.query(
  (callback: (editor: BangleEditor, editorId: EditorIdType) => void) => {
    return (state) => {
      const { mainEditors } = nsmEditorManagerSlice.get(state);

      for (const [editorId, editor] of mainEditors.entries()) {
        if (editor) {
          callback(editor, editorId);
        }
      }
    };
  },
);

const SERIAL_VERSION = 1;

export const persistState = sliceStateSerializer(nsmEditorManagerSliceKey, {
  dbKey: 'editorManagerSlice',
  schema: z.object({
    focusedEditorId: z.union([z.number(), z.undefined()]),
    editorConfig: openedEditorsConfigSchema,
  }),

  serialize: (state) => {
    const { editorConfig, focusedEditorId } = nsmEditorManagerSlice.get(state);

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

  deserialize: ({ version, data }): NsmEditorManagerState => {
    if (version < SERIAL_VERSION) {
      return initState;
    }

    return {
      ...initState,
      focusedEditorId: data.focusedEditorId,
      editorConfig: OpenedEditorsConfig.fromJsonObj(data.editorConfig),
    };
  },
});

const querySomeEditor = nsmEditorManagerSlice.query(
  (callback: (editor: BangleEditor, editorId: EditorIdType) => boolean) => {
    return (state): boolean => {
      const sliceState = nsmEditorManagerSlice.get(state);

      return someEditor(sliceState.mainEditors, callback);
    };
  },
);

function someEditor(
  mainEditors: EditorSliceState['mainEditors'],
  callback: (editor: BangleEditor, editorId: EditorIdType) => boolean,
): boolean {
  return Array.from(mainEditors.entries()).some(([editorId, editor]) =>
    editor ? callback(editor, editorId) : false,
  );
}
