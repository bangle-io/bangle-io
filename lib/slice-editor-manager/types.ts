import type { BangleEditor } from '@bangle.dev/core';

import type {
  ApplicationStore,
  SliceSideEffect,
} from '@bangle.io/create-store';
import type { JsonObject } from '@bangle.io/shared-types';

import type { OpenedEditorsConfig } from './opened-editors-config';

export type EditorIdType = number | undefined;

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
  focusedEditorId: number | undefined;
  editors: Array<BangleEditor | undefined>;
  editorConfig: OpenedEditorsConfig;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
  editingAllowed: boolean;
}

export type EditorManagerAction =
  | {
      name: 'action::@bangle.io/slice-editor-manager:set-editor';
      value: { editor: BangleEditor | undefined; editorId: number };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:toggle-editing';
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:on-focus-update';
      value: { editorId: number | undefined };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:update-scroll-position';
      value: {
        editorId: number;
        wsPath: string;
        scrollPosition: number;
      };
    }
  | {
      name: 'action::@bangle.io/slice-editor-manager:update-initial-selection-json';
      value: {
        editorId: number;
        wsPath: string;
        selectionJson: JsonObject;
      };
    };
