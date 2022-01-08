import { BangleEditor } from '@bangle.dev/core';
import type { EditorState, EditorView, Node } from '@bangle.dev/pm';
import { Selection } from '@bangle.dev/pm';

import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { AppState } from '@bangle.io/create-store';
import { getScrollParentElement } from '@bangle.io/utils';

import { editorManagerSliceKey } from './constants';
import { EditorDispatchType, EditorIdType } from './types';
import { calculateScrollPosition, calculateSelection } from './utils';

export function getEditor(editorId: EditorIdType) {
  return (state: AppState): BangleEditor | undefined => {
    if (editorId == null) {
      return undefined;
    }

    return editorManagerSliceKey.getSliceState(state)?.editors[editorId];
  };
}

export function focusEditor(editorId: EditorIdType = 0) {
  return (state: AppState): boolean => {
    const editor = getEditor(editorId)(state);
    if (editor) {
      editor?.focusView();
      return true;
    }
    return false;
  };
}
export function updateFocusedEditor(editorId: EditorIdType = 0) {
  return (state: AppState, dispatch: EditorDispatchType): boolean => {
    dispatch({
      name: 'action::editor-manager-context:on-focus-update',
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
        name: 'action::editor-manager-context:update-initial-selection-json',
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

    editorManagerState.editors.forEach((editor, index) => {
      if (index != null) {
        cb(editor, index);
      }
    });
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
        name: 'action::editor-manager-context:update-scroll-position',
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
      name: 'action::editor-manager-context:set-editor',
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
        name: 'action::editor-manager-context:set-editor',
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
  editorId: number,
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
    for (let i = 0; i < MAX_OPEN_EDITORS; i++) {
      const currentEditor = getEditor(i)(state);
      const prevEditor = getEditor(i)(prevState);

      if (currentEditor === prevEditor) {
        continue;
      }

      return true;
    }

    return false;
  };
}
