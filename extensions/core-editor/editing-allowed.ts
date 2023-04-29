import { Plugin } from '@bangle.dev/pm';

import type { EditorPlugin } from '@bangle.io/shared-types';
import { nsmEditorManagerSlice } from '@bangle.io/slice-editor-manager';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const editingAllowedPlugin: EditorPlugin =
  function editingAllowedPlugin() {
    return new Plugin({
      props: {
        editable(state) {
          const { nsmStore } = getEditorPluginMetadata(state);

          return nsmEditorManagerSlice.getState(nsmStore.state).editingAllowed;
        },
      },
    });
  };
