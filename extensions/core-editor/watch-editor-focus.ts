import type { EditorView } from '@bangle.dev/pm';
import { Plugin } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import type { EditorPlugin } from '@bangle.io/shared-types';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const watchEditorFocus: EditorPlugin = function watchEditorFocus() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        focus: (view: EditorView, event: Event) => {
          const { editorId } = getEditorPluginMetadata(view.state);

          if (editorId != null) {
            nsmApi2.editor.onFocusUpdate(editorId);
          }

          // This is important to return false so that
          // we don't interfere with PM's focus setting.
          return false;
        },
      },
    },
  });
};
