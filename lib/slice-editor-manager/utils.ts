import type { BangleEditor } from '@bangle.dev/core';
import type { EditorView } from '@bangle.dev/pm';

import { MAX_OPEN_EDITORS } from '@bangle.io/constants';
import { getEditorPluginMetadata } from '@bangle.io/editor-common';
import { z } from '@bangle.io/nsm-3';
import type { EditorIdType, WsPath } from '@bangle.io/shared-types';
import { findWrappingScrollable } from '@bangle.io/utils';

import type { EditorSliceState } from './types';

// In PM selection.toJSON() is of different types based on the selection type
// we only care about serializing and this type is good enough.
export type SelectionJson = z.infer<typeof selectionJsonSchema>;
// WARNING: before changing this schema, make sure to update the
//  make sure to update the manual check in `calculateSelection`
export const selectionJsonSchema = z.record(
  z.union([z.undefined(), z.string(), z.number(), z.null()]),
);

export const calculateSelection = (
  editorId: EditorIdType,
  editor: BangleEditor,
): {
  wsPath: WsPath;
  editorId: EditorIdType;
  selectionJson: SelectionJson;
} => {
  const selection = editor.view.state.selection;

  const json = selection.toJSON();

  for (const value of Object.values(json)) {
    if (
      typeof value !== 'number' &&
      typeof value !== 'string' &&
      value != null
    ) {
      throw new Error(`Invalid editor selection json value type: ${json}`);
    }
  }

  return {
    wsPath: getEditorPluginMetadata(editor.view.state).wsPath,
    editorId: editorId,
    selectionJson: json as SelectionJson,
  };
};

export const calculateScrollPosition = (
  editorId: EditorIdType,
  view: EditorView,
) => {
  const top = getScrollParentElement(editorId)?.scrollTop;

  if (typeof top === 'number') {
    return {
      wsPath: getEditorPluginMetadata(view.state).wsPath,
      editorId: editorId,
      scrollPosition: top,
    };
  }

  return undefined;
};

export function* getEachEditorIterable(
  editorManagerState: EditorSliceState,
): Iterable<{
  editor: BangleEditor | undefined;
  editorId: NonNullable<EditorIdType>;
}> {
  for (const [index, editor] of editorManagerState.mainEditors.entries()) {
    yield { editor, editorId: index };
  }
}

export function isValidEditorId(editorId: EditorIdType): boolean {
  return editorId >= 0 && editorId < MAX_OPEN_EDITORS;
}

export function assertValidEditorId(
  editorId: EditorIdType,
): asserts editorId is EditorIdType {
  if (!isValidEditorId(editorId)) {
    throw new Error('editorId is out of range or invalid');
  }
}

export function getScrollParentElement(editorId: EditorIdType) {
  const editor = document.querySelector(
    '.B-editor-container_editor-' + editorId,
  );

  if (editor) {
    return findWrappingScrollable(editor);
  }

  return undefined;
}
