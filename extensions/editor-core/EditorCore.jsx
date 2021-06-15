import React, { useCallback, useEffect, useContext } from 'react';
import { EditorManagerContext } from 'editor-manager-context/index';
import { useDispatchPrimaryEditor } from './hooks';
import {
  toggleHeadingCollapse,
  uncollapseAllHeadings,
} from '@bangle.dev/core/components/heading';
import {
  moveListItemUp,
  moveListItemDown,
} from '@bangle.dev/core/components/list-item/list-item';
export function EditorCore({ registerActionHandler }) {
  const { primaryEditor } = useContext(EditorManagerContext);
  const executeEditorCommand = useDispatchPrimaryEditor(false);

  const actionHandler = useCallback(
    (actionObject) => {
      switch (actionObject.name) {
        case '@action/editor-core/focus-primary-editor': {
          primaryEditor?.focusView();
          return true;
        }

        case '@action/editor-core/collapse-heading': {
          executeEditorCommand(toggleHeadingCollapse);
          return true;
        }

        case '@action/editor-core/uncollapse-all-heading': {
          executeEditorCommand(uncollapseAllHeadings);
          return true;
        }

        case '@action/editor-core/move-list-up': {
          executeEditorCommand(moveListItemUp);
          return true;
        }

        case '@action/editor-core/move-list-down': {
          executeEditorCommand(moveListItemDown);
          return true;
        }

        default: {
          return false;
        }
      }
    },
    [primaryEditor, executeEditorCommand],
  );

  useEffect(() => {
    const deregister = registerActionHandler((obj) => {
      actionHandler(obj);
    });
    return () => {
      deregister();
    };
  }, [actionHandler, registerActionHandler]);

  return null;
}
