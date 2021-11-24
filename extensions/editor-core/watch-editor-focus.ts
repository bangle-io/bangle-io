import { Plugin } from '@bangle.dev/pm';

import type { EditorPlugin } from '@bangle.io/shared-types';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const watchEditorFocus: EditorPlugin = function watchEditorFocus() {
  return new Plugin({
    props: {
      handleDOMEvents: {
        focus: (view, event) => {
          const { dispatchAction, editorId } = getEditorPluginMetadata(
            view.state,
          );
          dispatchAction({
            name: 'action::bangle-io-editor-core:on-focus-update',
            value: { editorId },
          });

          // This is important to return false so that
          // we dont interfere with PM's focus setting.
          return false;
        },
      },
    },
  });
};
