import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { Slice } from '@bangle.io/create-store';
import { assertActionName } from '@bangle.io/utils';

import { editorManagerSliceKey, initialEditorSliceState } from './constants';
import {
  disableEditingOnPageInactiveEffect,
  focusEditorEffect,
  initialSelectionEffect,
  syncEditingAllowedWithBlurEffect,
  trimWhiteSpaceEffect,
  watchEditorScrollEffect,
} from './effects';
import { OpenedEditorsConfig } from './opened-editors-config';
import type { EditorManagerAction, EditorSliceState } from './types';
import {
  calculateScrollPosition,
  calculateSelection,
  getEachEditorIterable,
  isValidEditorId,
} from './utils';

export const JSON_SCHEMA_VERSION = 'editor-slice/2';

const applyState = (
  action: EditorManagerAction,
  state: EditorSliceState,
): EditorSliceState => {
  switch (action.name) {
    case 'action::@bangle.io/slice-editor-manager:set-editing-allowed': {
      return {
        ...state,
        editingAllowed: action.value.editingAllowed,
      };
    }
    case 'action::@bangle.io/slice-editor-manager:set-editor': {
      const { editorId, editor } = action.value;

      if (!isValidEditorId(editorId)) {
        return state;
      }

      const newEditors: EditorSliceState['mainEditors'] = [
        ...state.mainEditors,
      ];
      newEditors[editorId] = editor;

      return {
        ...state,
        mainEditors: newEditors,
      };
    }

    case 'action::@bangle.io/slice-editor-manager:on-focus-update': {
      const editorId = action.value.editorId;

      if (!isValidEditorId(editorId)) {
        return state;
      }

      return {
        ...state,
        focusedEditorId: editorId,
      };
    }

    case 'action::@bangle.io/slice-editor-manager:update-scroll-position': {
      const { editorId, wsPath, scrollPosition } = action.value;

      if (!isValidEditorId(editorId)) {
        return state;
      }

      const newEditorConfig = state.editorConfig.updateScrollPosition(
        scrollPosition,
        wsPath,
        editorId,
      );

      return {
        ...state,
        editorConfig: newEditorConfig,
      };
    }

    case 'action::@bangle.io/slice-editor-manager:update-initial-selection-json': {
      const { editorId, wsPath, selectionJson } = action.value;

      if (!isValidEditorId(editorId)) {
        return state;
      }

      const newEditorConfig = state.editorConfig.updateSelection(
        selectionJson,
        wsPath,
        editorId,
      );

      return {
        ...state,
        editorConfig: newEditorConfig,
      };
    }

    default:
      return state;
  }
};

export function editorManagerSlice(): Slice<
  EditorSliceState,
  EditorManagerAction
> {
  assertActionName('@bangle.io/slice-editor-manager', editorManagerSliceKey);

  return new Slice({
    key: editorManagerSliceKey,
    state: {
      init() {
        return initialEditorSliceState;
      },
      apply(action, state) {
        const newState = applyState(action, state);

        if (newState === state) {
          return state;
        }

        // derived state
        newState.primaryEditor = newState.mainEditors[PRIMARY_EDITOR_INDEX];
        newState.secondaryEditor = newState.mainEditors[SECONDARY_EDITOR_INDEX];

        return newState;
      },

      stateFromJSON(_, value: any) {
        if (!value || value.version !== JSON_SCHEMA_VERSION) {
          return initialEditorSliceState;
        }

        const data = value.data;

        const sliceState: EditorSliceState = Object.assign(
          {},
          initialEditorSliceState,
          {
            editorConfig: OpenedEditorsConfig.fromJsonObj(data.editorConfig),
            focusedEditorId:
              data.focusedEditorId == null ? undefined : data.focusedEditorId,
          },
        );

        return sliceState;
      },

      stateToJSON(sliceState) {
        let newEditorConfig = sliceState.editorConfig;

        for (const { editor, editorId } of getEachEditorIterable(sliceState)) {
          if (editor) {
            const { selectionJson, wsPath } = calculateSelection(
              editorId,
              editor,
            );

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
          }
        }

        return {
          version: JSON_SCHEMA_VERSION,
          data: {
            focusedEditorId:
              sliceState.focusedEditorId == null
                ? null
                : sliceState.focusedEditorId,
            editorConfig: newEditorConfig.toJsonObj(),
          },
        };
      },
    },
    sideEffect: [
      initialSelectionEffect,
      focusEditorEffect,
      watchEditorScrollEffect,
      trimWhiteSpaceEffect,
      syncEditingAllowedWithBlurEffect,
      disableEditingOnPageInactiveEffect,
    ],
  });
}
