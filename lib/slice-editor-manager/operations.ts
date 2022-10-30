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
import type { AppState } from '@bangle.io/create-store';
import { getScrollParentElement } from '@bangle.io/utils';

import { editorManagerSliceKey } from './constants';
import type { EditorDispatchType, EditorIdType } from './types';
import {
  assertValidEditorId,
  calculateScrollPosition,
  calculateSelection,
  getEachEditorIterable,
  isValidEditorId,
} from './utils';

/**
 * Enables or disables editing.
 *
 * @param param0.focusOrBlur - if true : focuses when enabling editing, blurs when disabling editing
 * @returns
 */
export function toggleEditing({
  focusOrBlur = true,
}: { focusOrBlur?: boolean } = {}) {
  return editorManagerSliceKey.op((state, dispatch) => {
    const { editingAllowed } =
      editorManagerSliceKey.getSliceStateAsserted(state);
    dispatch({
      name: 'action::@bangle.io/slice-editor-manager:toggle-editing',
    });

    if (!focusOrBlur) {
      return;
    }

    for (const { editor } of getEachEditorIterable(
      editorManagerSliceKey.getSliceStateAsserted(state),
    )) {
      // send empty transaction so that editor view can update
      // the editing state
      editor?.view.dispatch(
        editor.view.state.tr.setMeta('__activitybar_empty__', true),
      );

      if (!editingAllowed) {
        editor?.focusView();
      } else {
        editor?.view.dom.blur();
      }
    }
  });
}

export function isEditingAllowed() {
  return editorManagerSliceKey.queryOp((state) => {
    return editorManagerSliceKey.getSliceStateAsserted(state).editingAllowed;
  });
}

export function getPrimaryEditor() {
  return editorManagerSliceKey.queryOp((state) => {
    return getEditor(PRIMARY_EDITOR_INDEX)(state);
  });
}

export function focusPrimaryEditor() {
  return editorManagerSliceKey.queryOp((state) => {
    return focusEditor(PRIMARY_EDITOR_INDEX)(state);
  });
}

export function getSecondaryEditor() {
  return editorManagerSliceKey.queryOp((state) => {
    return getEditor(SECONDARY_EDITOR_INDEX)(state);
  });
}

export function focusSecondaryEditor() {
  return editorManagerSliceKey.queryOp((state) => {
    return focusEditor(SECONDARY_EDITOR_INDEX)(state);
  });
}

export function getEditor(editorId: EditorIdType) {
  return editorManagerSliceKey.queryOp((state): BangleEditor | undefined => {
    if (!isValidEditorId(editorId)) {
      return undefined;
    }

    return editorManagerSliceKey.getSliceState(state)?.mainEditors[editorId];
  });
}

export function focusEditor(editorId: EditorIdType = PRIMARY_EDITOR_INDEX) {
  return (state: AppState): boolean => {
    assertValidEditorId(editorId);

    const editor = getEditor(editorId)(state);

    if (editor) {
      editor.focusView();

      return true;
    }

    return false;
  };
}

export function updateFocusedEditor(
  editorId: EditorIdType = PRIMARY_EDITOR_INDEX,
) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    assertValidEditorId(editorId);

    dispatch({
      name: 'action::@bangle.io/slice-editor-manager:on-focus-update',
      value: {
        editorId,
      },
    });

    return true;
  };
}

export function updateInitialSelection(editorId: EditorIdType) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    assertValidEditorId(editorId);

    const editor = getEditor(editorId)(state);

    if (!editor) {
      return false;
    }

    const value = calculateSelection(editorId, editor);

    if (value) {
      dispatch({
        name: 'action::@bangle.io/slice-editor-manager:update-initial-selection-json',
        value: value,
      });

      return true;
    }

    return false;
  };
}

export function forEachEditor(
  cb: (editor: BangleEditor | undefined, index: number) => void,
) {
  return editorManagerSliceKey.queryOp((state): void => {
    const editorManagerState = editorManagerSliceKey.getSliceState(state);

    if (!editorManagerState) {
      return;
    }

    for (const { editor, editorId } of getEachEditorIterable(
      editorManagerState,
    )) {
      cb(editor, editorId);
    }
  });
}

export function getEditorView(editorId: EditorIdType) {
  return (state: AppState): EditorView | undefined => {
    assertValidEditorId(editorId);

    let editor = getEditor(editorId)(state);

    if (!editor) {
      return undefined;
    }

    return editor.view;
  };
}

export function getEditorState(editorId: EditorIdType) {
  return (state: AppState): EditorState | undefined => {
    assertValidEditorId(editorId);

    return getEditorView(editorId)(state)?.state;
  };
}

export function geEditorScrollPosition(editorId: EditorIdType, wsPath: string) {
  return (state: AppState): number | undefined => {
    assertValidEditorId(editorId);

    const sliceState = editorManagerSliceKey.getSliceState(state);

    if (!sliceState) {
      return undefined;
    }

    return sliceState.editorConfig.getScrollPosition(wsPath, editorId);
  };
}

export function updateScrollPosition(editorId: EditorIdType) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    assertValidEditorId(editorId);

    const editor = getEditor(editorId)(state);

    if (!editor || typeof editorId !== 'number') {
      return false;
    }

    const result = calculateScrollPosition(editorId, editor);

    if (result) {
      dispatch({
        name: 'action::@bangle.io/slice-editor-manager:update-scroll-position',
        value: result,
      });

      return true;
    }

    return false;
  };
}

export function setEditorReady(
  editorId: EditorIdType,
  wsPath: string,
  editor: BangleEditor,
) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    assertValidEditorId(editorId);

    const scrollParent = getScrollParentElement(editorId);
    const pos = geEditorScrollPosition(editorId, wsPath)(state);

    if (typeof pos === 'number' && scrollParent) {
      scrollParent.scrollTop = pos;
    }

    dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editor',
      value: {
        editor,
        editorId,
      },
    });

    // TODO this is currently used by the integration tests
    // we need a better way to do this
    if (typeof window !== 'undefined') {
      (window as any)[`editor-${editorId}`] = { editor, wsPath };
    }

    return true;
  };
}

export function setEditorUnmounted(
  editorId: EditorIdType,
  editor: BangleEditor,
) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    assertValidEditorId(editorId);

    // make sure we are unsetting the correct editor
    if (getEditor(editorId)(state) === editor) {
      dispatch({
        name: 'action::@bangle.io/slice-editor-manager:set-editor',
        value: {
          editor: undefined,
          editorId,
        },
      });

      return true;
    }

    return false;
  };
}
// Gets the editor selection saved in the slice state
export function getInitialSelection(
  editorId: EditorIdType,
  wsPath: string,
  doc: Node,
) {
  return (state: AppState): Selection | undefined => {
    assertValidEditorId(editorId);

    const sliceState = editorManagerSliceKey.getSliceState(state);

    if (!sliceState) {
      return undefined;
    }

    const initialSelection: any = sliceState.editorConfig.getSelection(
      wsPath,
      editorId,
    );

    if (initialSelection) {
      let selection =
        Math.max(initialSelection?.anchor, initialSelection?.head) >=
        doc.content.size
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

// Returns true or false if a new editor was added
// or an editor was removed.
export function didSomeEditorChange(prevState: AppState) {
  return (state: AppState): boolean => {
    for (const { editor: currentEditor, editorId } of getEachEditorIterable(
      editorManagerSliceKey.getSliceStateAsserted(state),
    )) {
      const prevEditor = getEditor(editorId)(prevState);

      if (currentEditor === prevEditor) {
        continue;
      }

      return true;
    }

    return false;
  };
}

export function dispatchEditorCommand<T>(
  editorId: EditorIdType,
  cmdCallback: (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
    view?: EditorView,
  ) => T,
) {
  return (state: AppState): T | false => {
    assertValidEditorId(editorId);

    const currentEditor = getEditor(editorId)(state);

    if (!currentEditor) {
      return false;
    }

    const view = currentEditor.view;

    return cmdCallback(view.state, view.dispatch, view);
  };
}

/**
 *
 * @param editorId skip to blur any editor
 * @returns
 */
export function blurEditor(editorId?: EditorIdType) {
  if (editorId !== undefined) {
    assertValidEditorId(editorId);
  }

  return editorManagerSliceKey.queryOp((state) => {
    forEachEditor((editor, currentEditorId) => {
      if (editorId == null || currentEditorId === editorId) {
        editor?.view.dom.blur();
      }
    })(state);
  });
}

export function someEditorHasFocus() {
  return editorManagerSliceKey.queryOp((state) => {
    for (const { editor } of getEachEditorIterable(
      editorManagerSliceKey.getSliceStateAsserted(state),
    )) {
      if (editor?.view.hasFocus()) {
        return true;
      }
    }

    return false;
  });
}
