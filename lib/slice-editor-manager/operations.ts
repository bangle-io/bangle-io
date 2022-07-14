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
  calculateScrollPosition,
  calculateSelection,
  getEachEditorIterable,
} from './utils';

export function toggleEditing() {
  return editorManagerSliceKey.op((_, dispatch) => {
    dispatch({
      name: 'action::@bangle.io/slice-editor-manager:toggle-editing',
    });
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
  return (state: AppState): BangleEditor | undefined => {
    if (editorId == null) {
      return undefined;
    }

    return editorManagerSliceKey.getSliceState(state)?.mainEditors[editorId];
  };
}

export function focusEditor(editorId: EditorIdType = PRIMARY_EDITOR_INDEX) {
  return (state: AppState): boolean => {
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
    const editor = getEditor(editorId)(state);

    if (!editor || typeof editorId !== 'number') {
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
  return (state: AppState): void => {
    const editorManagerState = editorManagerSliceKey.getSliceState(state);

    if (!editorManagerState) {
      return;
    }

    for (const { editor, editorId } of getEachEditorIterable(
      editorManagerState,
    )) {
      cb(editor, editorId);
    }
  };
}

export function getEditorView(editorId: EditorIdType) {
  return (state: AppState): EditorView | undefined => {
    if (editorId == null) {
      return undefined;
    }
    let editor = getEditor(editorId)(state);

    if (!editor) {
      return undefined;
    }

    return editor.view;
  };
}

export function getEditorState(editorId: EditorIdType) {
  return (state: AppState): EditorState | undefined => {
    return getEditorView(editorId)(state)?.state;
  };
}

export function geEditorScrollPosition(editorId: EditorIdType, wsPath: string) {
  return (state: AppState): number | undefined => {
    const sliceState = editorManagerSliceKey.getSliceState(state);

    if (!sliceState) {
      return undefined;
    }

    return sliceState.editorConfig.getScrollPosition(wsPath, editorId);
  };
}

export function updateScrollPosition(editorId: EditorIdType) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
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
    if (typeof editorId !== 'number') {
      return false;
    }

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

    return true;
  };
}

export function setEditorUnmounted(
  editorId: EditorIdType,
  editor: BangleEditor,
) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    if (typeof editorId !== 'number') {
      return false;
    }

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
          : Selection.fromJSON(doc, initialSelection);
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
    const currentEditor = getEditor(editorId)(state);

    if (!currentEditor) {
      return false;
    }

    const view = currentEditor.view;

    return cmdCallback(view.state, view.dispatch, view);
  };
}
