import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { Slice } from '@bangle.io/create-store';
import { assertActionType, createEmptyArray } from '@bangle.io/utils';

import { editorManagerSliceKey } from './constants';
import {
  focusEditorEffect,
  initialSelectionEffect,
  trimWhiteSpaceEffect,
  watchEditorScrollEffect,
} from './effects';
import { OpenedEditorsConfig } from './opened-editors-config';
import type { EditorManagerAction, EditorSliceState } from './types';
import { calculateScrollPosition, calculateSelection } from './utils';

const LOG = false;
let log = LOG ? console.log.bind(console, 'editorManagerSlice') : () => {};

export const JSON_SCHEMA_VERSION = 'editor-slice/2';

export const initialEditorSliceState: EditorSliceState = {
  focusedEditorId: undefined,
  editors: createEmptyArray(MAX_OPEN_EDITORS),
  editorConfig: OpenedEditorsConfig.fromJsonObj({
    selections: [],
    scrollPositions: [],
  }),
  primaryEditor: undefined,
  secondaryEditor: undefined,
};

const applyState = (
  action: EditorManagerAction,
  state: EditorSliceState,
): EditorSliceState => {
  if (action.name.startsWith('action::@bangle.io/editor-manager-context:')) {
    log(action.name, action.value);
  }
  switch (action.name) {
    case 'action::@bangle.io/editor-manager-context:set-editor': {
      const { editorId, editor } = action.value;
      if (editorId >= MAX_OPEN_EDITORS) {
        throw new Error('editorId is out of range');
      }

      const newEditors: EditorSliceState['editors'] = [...state.editors];

      newEditors[editorId] = editor;

      return {
        ...state,
        editors: newEditors,
      };
    }

    case 'action::@bangle.io/editor-manager-context:on-focus-update': {
      const editorId = action.value.editorId;
      if (typeof editorId === 'number' && editorId >= MAX_OPEN_EDITORS) {
        throw new Error('editorId is out of range');
      }

      return {
        ...state,
        focusedEditorId: editorId,
      };
    }

    case 'action::@bangle.io/editor-manager-context:update-scroll-position': {
      const { editorId, wsPath, scrollPosition } = action.value;

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

    case 'action::@bangle.io/editor-manager-context:update-initial-selection-json': {
      const { editorId, wsPath, selectionJson } = action.value;

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
  assertActionType(
    '@bangle.io/editor-manager-context',
    {} as EditorManagerAction,
  );

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
        newState.primaryEditor = newState.editors[0];
        newState.secondaryEditor = newState.editors[1];

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
            focusedEditorId: data.focusedEditorId,
          },
        );
        return sliceState;
      },

      stateToJSON(sliceState) {
        let newEditorConfig = sliceState.editorConfig;
        for (let i = 0; i < MAX_OPEN_EDITORS; i++) {
          const editor = sliceState.editors[i];
          if (editor) {
            const { editorId, selectionJson, wsPath } = calculateSelection(
              i,
              editor,
            );

            const scroll = calculateScrollPosition(i, editor)?.scrollPosition;
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
            ...initialEditorSliceState,
            editors: [],
            focusedEditorId: sliceState.focusedEditorId,
            editorConfig: newEditorConfig.toJsonObj(),
            primaryEditor: undefined,
            secondaryEditor: undefined,
          },
        };
      },
    },
    sideEffect: [
      initialSelectionEffect,
      focusEditorEffect,
      watchEditorScrollEffect,
      trimWhiteSpaceEffect,
    ],
  });
}
