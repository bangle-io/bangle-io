import type { BangleEditor } from '@bangle.dev/core';
import type { Node } from '@bangle.dev/pm';
import { Selection } from '@bangle.dev/pm';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { sliceKey, sliceStateSerializer, z } from '@bangle.io/nsm-3';
import type { EditorIdType } from '@bangle.io/shared-types';
import { nsmPageSlice } from '@bangle.io/slice-page';
import { shallowEqual } from '@bangle.io/utils';

import { initialEditorSliceState } from './constants';
import {
  OpenedEditorsConfig,
  openedEditorsConfigSchema,
} from './opened-editors-config';
import type { EditorSliceState } from './types';
import {
  assertValidEditorId,
  calculateScrollPosition,
  calculateSelection,
  getScrollParentElement,
} from './utils';

type NsmEditorManagerState = typeof initialEditorSliceState;

export const nsmEditorManagerSliceKey = sliceKey([nsmPageSlice], {
  name: 'editor-manager-slice',
  state: initialEditorSliceState,
});

const primaryEditor = nsmEditorManagerSliceKey.selector((storeState) => {
  const { mainEditors } = nsmEditorManagerSliceKey.get(storeState);

  return mainEditors[PRIMARY_EDITOR_INDEX];
});

const secondaryEditor = nsmEditorManagerSliceKey.selector((storeState) => {
  const { mainEditors } = nsmEditorManagerSliceKey.get(storeState);

  return mainEditors[SECONDARY_EDITOR_INDEX];
});

const lastOpenedEditor = nsmEditorManagerSliceKey.selector(
  (storeState) => {
    const { editorOpenOrder, mainEditors } =
      nsmEditorManagerSliceKey.get(storeState);
    const lastEditorId = editorOpenOrder[0];
    const lastEditor =
      typeof lastEditorId === 'number' ? mainEditors[lastEditorId] : undefined;

    return typeof lastEditorId === 'number' && lastEditor
      ? {
          editorId: lastEditorId,
          editor: lastEditor,
        }
      : undefined;
  },
  {
    equal: shallowEqual,
  },
);

export const nsmEditorManagerSlice = nsmEditorManagerSliceKey.slice({
  derivedState: {
    primaryEditor,
    secondaryEditor,
    lastOpenedEditor,
  },
});

export const setEditorScrollPos = nsmEditorManagerSlice.query(
  (wsPath: string, editorId: EditorIdType) => {
    return (state) => {
      const scrollParent = getScrollParentElement(editorId);
      const editorConfig = nsmEditorManagerSlice.get(state).editorConfig;
      const pos = editorConfig.getScrollPosition(wsPath, editorId);

      if (typeof pos === 'number' && scrollParent) {
        scrollParent.scrollTop = pos;
      }
    };
  },
);

export const focusEditorIfNotFocused = nsmEditorManagerSlice.query(
  (editorId?: EditorIdType) => (state) => {
    if (querySomeEditor(state, (editor) => editor.view.hasFocus())) {
      return;
    }

    if (editorId != null) {
      const editor = getEditor(state, editorId);

      if (editor) {
        editor.focusView();

        return;
      }
    }

    nsmEditorManagerSlice.get(state).lastOpenedEditor?.editor?.focusView();
  },
);

export const getEditor = nsmEditorManagerSlice.query(
  (editorId: EditorIdType) => {
    return (state) => {
      assertValidEditorId(editorId);

      const sliceState = nsmEditorManagerSlice.get(state);

      return sliceState.mainEditors[editorId];
    };
  },
);

export const getInitialSelection = nsmEditorManagerSlice.query(
  (editorId: EditorIdType, wsPath: string, doc: Node) => {
    return (state) => {
      assertValidEditorId(editorId);

      const sliceState = nsmEditorManagerSlice.get(state);

      if (!sliceState) {
        return undefined;
      }

      const initialSelection = sliceState.editorConfig.getSelection(
        wsPath,
        editorId,
      );

      if (initialSelection) {
        const anchor =
          typeof initialSelection?.anchor === 'number'
            ? initialSelection.anchor
            : undefined;

        const head =
          typeof initialSelection?.head === 'number'
            ? initialSelection.head
            : undefined;

        let isOutside = false;

        if (anchor != null && head != null) {
          isOutside = Math.max(anchor, head) >= doc.content.size;
        }

        let selection = isOutside
          ? Selection.atEnd(doc)
          : safeSelectionFromJSON(doc, initialSelection);
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
  },
);

function safeSelectionFromJSON(doc: Node, json: any) {
  try {
    // this can throw error if invalid json is passed
    // since we donot control the json we need swallow the error
    return Selection.fromJSON(doc, json);
  } catch (error) {
    if (error instanceof RangeError) {
      return Selection.atStart(doc);
    }
    throw error;
  }
}

export const forEachEditor = nsmEditorManagerSlice.query(
  (callback: (editor: BangleEditor, editorId: EditorIdType) => void) => {
    return (state) => {
      const { mainEditors } = nsmEditorManagerSlice.get(state);

      for (const [editorId, editor] of mainEditors.entries()) {
        if (editor) {
          callback(editor, editorId);
        }
      }
    };
  },
);

const SERIAL_VERSION = 1;

export const persistState = sliceStateSerializer(nsmEditorManagerSliceKey, {
  dbKey: 'editorManagerSlice',
  schema: z.object({
    focusedEditorId: z.union([z.number(), z.undefined()]),
    editorConfig: openedEditorsConfigSchema,
  }),

  serialize: (state) => {
    const { editorConfig, focusedEditorId } = nsmEditorManagerSlice.get(state);

    let newEditorConfig = editorConfig;

    forEachEditor(state, (editor, editorId) => {
      const { selectionJson, wsPath } = calculateSelection(editorId, editor);

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
    });

    return {
      version: SERIAL_VERSION,
      data: {
        focusedEditorId: focusedEditorId,
        editorConfig: newEditorConfig.toJsonObj(),
      },
    };
  },

  deserialize: ({ version, data }): NsmEditorManagerState => {
    if (version < SERIAL_VERSION) {
      return initialEditorSliceState;
    }

    return {
      ...initialEditorSliceState,
      focusedEditorId: data.focusedEditorId,
      editorConfig: OpenedEditorsConfig.fromJsonObj(data.editorConfig),
    };
  },
});

const querySomeEditor = nsmEditorManagerSlice.query(
  (callback: (editor: BangleEditor, editorId: EditorIdType) => boolean) => {
    return (state): boolean => {
      const sliceState = nsmEditorManagerSlice.get(state);

      return someEditor(sliceState.mainEditors, callback);
    };
  },
);

export function someEditor(
  mainEditors: EditorSliceState['mainEditors'],
  callback: (editor: BangleEditor, editorId: EditorIdType) => boolean,
): boolean {
  return Array.from(mainEditors.entries()).some(([editorId, editor]) =>
    editor ? callback(editor, editorId) : false,
  );
}
