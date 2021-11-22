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

          return true;
        },
      },
    },
  });
};
