import type { BangleEditor } from '@bangle.dev/core';

import type { EditorIdType } from '@bangle.io/shared-types';

import { nsmEditorManagerSlice } from './slice';
import type { EditorSliceState } from './types';
import type { SelectionJson } from './utils';
import { isValidEditorId } from './utils';

export const noOp = nsmEditorManagerSlice.action(function noOp() {
  return nsmEditorManagerSlice.tx((state) => {
    return nsmEditorManagerSlice.update(state, (sliceState) => {
      return sliceState;
    });
  });
});

export const setEditingAllowed =
  nsmEditorManagerSlice.simpleAction('editingAllowed');

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

export const onFocusUpdate = nsmEditorManagerSlice.simpleAction(
  'focusedEditorId',
  (editorId, state) => {
    if (typeof editorId === 'number' && !isValidEditorId(editorId)) {
      return nsmEditorManagerSlice.get(state);
    }

    return {
      focusedEditorId: editorId,
    };
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

export const updateQueryAction =
  nsmEditorManagerSlice.simpleAction('searchQuery');
