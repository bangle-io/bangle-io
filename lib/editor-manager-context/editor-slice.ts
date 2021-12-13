import type { BangleEditor } from '@bangle.dev/core';
import type { EditorState, EditorView } from '@bangle.dev/pm';

import { ApplicationStore, Slice, SliceKey } from '@bangle.io/create-store';
import { safeRequestIdleCallback } from '@bangle.io/utils';

const MAX_EDITOR = 2;

type TAppStore = ApplicationStore<EditorSliceState, EditorManagerAction>;
type AppState = TAppStore['state'];

export type EditorDispatchType = TAppStore['dispatch'];

export type EditorManagerAction =
  | {
      name: 'action::editor-manager-context:set-editor';
      value: { editor: BangleEditor | undefined; editorId: number };
    }
  | {
      name: 'action::editor-manager-context:on-focus-update';
      value: { editorId: number | undefined };
    }
  | {
      name: 'action::editor-manager-context:focus-primary-editor';
    }
  | {
      name: 'action::editor-manager-context:focus-secondary-editor';
    };

export interface EditorSliceState {
  focusedEditorId: number | undefined;
  editors: EditorsType;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
}

type EditorsType = [BangleEditor | undefined, BangleEditor | undefined];

export const editorManagerSliceKey = new SliceKey<
  EditorSliceState,
  EditorManagerAction
>('editor-manager-slice');

export const initialEditorSliceState: EditorSliceState = {
  focusedEditorId: undefined,
  editors: [undefined, undefined],
  primaryEditor: undefined,
  secondaryEditor: undefined,
};

export function editorManagerSlice(): Slice<
  EditorSliceState,
  EditorManagerAction
> {
  return new Slice({
    key: editorManagerSliceKey,
    state: {
      init() {
        return initialEditorSliceState;
      },
      apply(action, state) {
        switch (action.name) {
          case 'action::editor-manager-context:set-editor': {
            const { editorId, editor } = action.value;

            if (editorId > MAX_EDITOR) {
              throw new Error(`Only ${MAX_EDITOR + 1} allowed`);
            }

            const newArray = state.editors.slice(0) as EditorsType;
            newArray[editorId] = editor;

            const [primaryEditor, secondaryEditor] = newArray;

            // TODO this is currently used by the integration tests
            // we need a better way to do this
            if (typeof window !== 'undefined') {
              (window as any).primaryEditor = primaryEditor;
              (window as any).secondaryEditor = secondaryEditor;
            }

            return {
              ...state,
              editors: newArray,
              primaryEditor,
              secondaryEditor,
            };
          }

          case 'action::editor-manager-context:on-focus-update': {
            return {
              ...state,
              focusedEditorId: action.value.editorId,
            };
          }

          case 'action::editor-manager-context:focus-primary-editor': {
            state.primaryEditor?.focusView();
            return state;
          }

          case 'action::editor-manager-context:focus-secondary-editor': {
            state.secondaryEditor?.focusView();
            return state;
          }

          default:
            return state;
        }
      },
    },
    sideEffect(store) {
      return {
        deferredUpdate(store) {
          // TODO: this setup should be done in app
          safeRequestIdleCallback(() => {
            if (
              typeof window !== 'undefined' &&
              window.location?.hash?.includes('debug_pm')
            ) {
              const primaryEditor = editorManagerSliceKey.getSliceState(
                store.state,
              )?.primaryEditor;
              if (primaryEditor) {
                console.log('debugging pm');
                import(
                  /* webpackChunkName: "prosemirror-dev-tools" */ 'prosemirror-dev-tools'
                ).then((args) => {
                  args.applyDevTools(primaryEditor!.view);
                });
              }
            }
          });
        },
      };
    },
  });
}

export function forEachEditor(
  cb: (editor: BangleEditor, index: number) => void,
) {
  return (state: AppState): void => {
    editorManagerSliceKey
      .getSliceState(state)
      ?.editors.forEach((editor, index) => {
        if (editor) {
          cb(editor, index);
        }
      });
  };
}

export function getEditor(editorId?: number) {
  return (state: AppState): BangleEditor | undefined => {
    if (editorId == null) {
      return undefined;
    }
    return editorManagerSliceKey.getSliceState(state)?.editors[editorId];
  };
}

export function getEditorView(editorId?: number) {
  return (state: AppState): EditorView | undefined => {
    if (editorId == null) {
      return undefined;
    }
    let editor = getEditor(editorId)(state);

    if (!editor || editor.destroyed) {
      return undefined;
    }

    return editor.view;
  };
}

export function getEditorState(editorId?: number) {
  return (state: AppState): EditorState | undefined => {
    return getEditorView(editorId)(state)?.state;
  };
}
