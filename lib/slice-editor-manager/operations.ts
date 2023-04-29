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
  editingAllowed,
}: { focusOrBlur?: boolean; editingAllowed?: boolean } = {}) {
  return editorManagerSliceKey.op((state, dispatch) => {
    const newEditingAllowed =
      editingAllowed ??
      !editorManagerSliceKey.getSliceStateAsserted(state).editingAllowed;

    dispatch({
      name: 'action::@bangle.io/slice-editor-manager:set-editing-allowed',
      value: { editingAllowed: newEditingAllowed },
    });

    if (!focusOrBlur) {
      return;
    }

    for (const { editor } of getEachEditorIterable(
      editorManagerSliceKey.getSliceStateAsserted(state),
    )) {
      if (editor?.view.isDestroyed) {
        continue;
      }

      // send empty transaction so that editor view can update
      // the editing state
      editor?.view.dispatch(
        editor.view.state.tr.setMeta('__activitybar_empty__', true),
      );

      if (newEditingAllowed) {
        editor?.focusView();
      } else {
        editor?.view.dom.blur();
      }
    }
  });
}

export function getPrimaryEditor() {
  return editorManagerSliceKey.queryOp((state) => {
    return getEditor(PRIMARY_EDITOR_INDEX)(state);
  });
}

export function getSecondaryEditor() {
  return editorManagerSliceKey.queryOp((state) => {
    return getEditor(SECONDARY_EDITOR_INDEX)(state);
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

    const result = calculateScrollPosition(editorId, editor.view);

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
