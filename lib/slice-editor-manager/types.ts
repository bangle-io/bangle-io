import type { BangleEditor } from '@bangle.dev/core';

import type {
  ApplicationStore,
  SliceSideEffect,
} from '@bangle.io/create-store';
import type { JsonObject } from '@bangle.io/shared-types';

import type { OpenedEditorsConfig } from './opened-editors-config';

// TODO: can make this a nominal type
export type EditorIdType = number;

export type EditorDispatchType = ApplicationStore<
  EditorSliceState,
  EditorManagerAction
>['dispatch'];

export type SideEffect = SliceSideEffect<EditorSliceState, EditorManagerAction>;

export interface EditorSliceState {
  // WARNING: avoid using editor in the useMemo or any React Hooks or React.memo or React.PureComponent
  // dependency array as it causes memory leak due to react caching the editor for future use
  // but an editor will never reused once it is detroyed.
  // Please see https://github.com/bangle-io/bangle-io/blob/dev/lib/editor/Editor.tsx for
  // an indepth explaination.
  focusedEditorId: EditorIdType | undefined;
  mainEditors: Array<BangleEditor | undefined>;
  editorConfig: OpenedEditorsConfig;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
  editingAllowed: boolean;
}

export type EditorManagerAction =
  | {
      name: 'action::@bangle.io/slice-editor-manager:set-editor';
      value: { editor: BangleEditor | undefined; editorId: EditorIdType };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:set-editing-allowed';
      value: {
        editingAllowed: boolean;
      };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:on-focus-update';
      value: { editorId: EditorIdType };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:update-scroll-position';
      value: {
        editorId: EditorIdType;
        wsPath: string;
        scrollPosition: number;
      };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:update-initial-selection-json';
      value: {
        editorId: EditorIdType;
        wsPath: string;
        selectionJson: JsonObject;
      };
    };
