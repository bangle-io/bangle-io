import { EditorView, Plugin } from '@bangle.dev/pm';

import type { EditorPlugin } from '@bangle.io/shared-types';
import { isEditingAllowed } from '@bangle.io/slice-editor-manager';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const editingAllowedPlugin: EditorPlugin =
  function editingAllowedPlugin() {
    return new Plugin({
      props: {
        editable(state) {
          const { bangleStore } = getEditorPluginMetadata(state);

          return isEditingAllowed()(bangleStore.state);
        },
      },
    });
  };
