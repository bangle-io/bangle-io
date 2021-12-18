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
  focusedEditorId: number | undefined;
  editors: (BangleEditor | undefined)[];
  editorConfig: OpenedEditorsConfig;
  primaryEditor: BangleEditor | undefined;
  secondaryEditor: BangleEditor | undefined;
}

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
      name: 'action::editor-manager-context:update-scroll-position';
      value: {
        editorId: number;
        wsPath: string;
        scrollPosition: number;
      };
    }
  | {
      name: 'action::editor-manager-context:update-initial-selection-json';
      value: {
        editorId: number;
        wsPath: string;
        selectionJson: JsonObject;
      };
    };
