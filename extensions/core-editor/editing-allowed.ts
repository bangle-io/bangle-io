import { Plugin } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import type { EditorPlugin } from '@bangle.io/shared-types';

export const editingAllowedPlugin: EditorPlugin =
  function editingAllowedPlugin() {
    return new Plugin({
      props: {
        editable() {
          return nsmApi2.editor.editorState().editingAllowed;
        },
      },
    });
  };
