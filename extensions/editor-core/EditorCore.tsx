import { useCallback, useEffect } from 'react';

import { heading, listItem } from '@bangle.dev/base-components';

import { watchIsScrollingPluginKey } from '@bangle.io/constants';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { watchIsScrollingPlugin } from '@bangle.io/pm-plugins';

import { useDispatchPrimaryEditor } from './hooks';

const { toggleHeadingCollapse, uncollapseAllHeadings } = heading;
const { moveListItemUp, moveListItemDown } = listItem;

export function EditorCore({ registerActionHandler }) {
  const {
    primaryEditor,
    updateFocusedEditor,
    updateIsEditorScrolling,
    getEditorState,
  } = useEditorManagerContext();
  const executeEditorCommand = useDispatchPrimaryEditor(false);

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case 'action::bangle-io-editor-core:focus-primary-editor': {
          primaryEditor?.focusView();
          return true;
        }

        case 'action::bangle-io-editor-core:collapse-heading': {
          executeEditorCommand(toggleHeadingCollapse);
          return true;
        }

        case 'action::bangle-io-editor-core:uncollapse-all-heading': {
          executeEditorCommand(uncollapseAllHeadings);
          return true;
        }

        case 'action::bangle-io-editor-core:move-list-up': {
          executeEditorCommand(moveListItemUp);
          return true;
        }

        case 'action::bangle-io-editor-core:move-list-down': {
          executeEditorCommand(moveListItemDown);
          return true;
        }

        case 'action::bangle-io-editor-core:on-focus-update': {
          updateFocusedEditor(actionObject.value.editorId);
          return true;
        }

        case 'action::bangle-io-editor-core:on-scroll-update': {
          const editorId = actionObject.value.editorId;
          if (editorId != null) {
            const state = getEditorState(editorId);
            if (state) {
              const value = watchIsScrollingPluginKey.getState(state);
              if (value) {
                updateIsEditorScrolling(editorId, value.isScrolling);
              }
            }
          }
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [
      primaryEditor,
      updateFocusedEditor,
      updateIsEditorScrolling,
      executeEditorCommand,
      getEditorState,
    ],
  );

  useEffect(() => {
    const deregister = registerActionHandler((obj) => {
      actionHandler(obj);
    });
    return () => {
      console.count('deregsitering');
      deregister();
    };
  }, [actionHandler, registerActionHandler]);

  return null;
}
