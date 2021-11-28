import React, { useCallback, useEffect, useState } from 'react';

import { Selection } from '@bangle.dev/pm';

import { useActionHandler } from '@bangle.io/action-context';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { cx } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import {
  HeadingNodes,
  WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION,
  watchHeadingsPluginKey,
} from './config';

export function NoteOutline() {
  const { focusedEditorId, getEditor, getEditorState } =
    useEditorManagerContext();

  const { wsName } = useWorkspaceContext();

  const [headingNodes, updateHeadingsState] = useState<
    HeadingNodes | undefined
  >();

  const updateHeadingNodes = useCallback(() => {
    const state = focusedEditorId != null && getEditorState(focusedEditorId);
    if (!state) {
      updateHeadingsState(undefined);
      return;
    }
    const watchHeadingsPluginState = watchHeadingsPluginKey.getState(state);

    if (!watchHeadingsPluginState) {
      return;
    }
    updateHeadingsState(watchHeadingsPluginState.headings);
    return;
  }, [focusedEditorId, getEditorState]);

  // Calculate headings on initial mount
  useEffect(() => {
    updateHeadingNodes();
  }, [wsName, updateHeadingNodes]);

  useActionHandler(
    (action) => {
      if (action.name === WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION) {
        const editorId: unknown = action.value?.editorId;
        if (typeof editorId !== 'number' || editorId !== focusedEditorId) {
          // change is from an editor which doesnt have id
          return false;
        }
        updateHeadingNodes();
        return true;
      }

      return false;
    },
    [updateHeadingNodes, focusedEditorId],
  );

  const onExecuteItem = useCallback(
    (item: HeadingNodes[0]) => {
      const focusedEditor =
        focusedEditorId != null && getEditor(focusedEditorId);
      if (focusedEditor) {
        if (!focusedEditor || focusedEditor.destroyed) {
          return;
        }

        focusedEditor.focusView();
        const { dispatch, state } = focusedEditor.view;
        const tr = state.tr;
        dispatch(
          tr
            .setSelection(Selection.near(tr.doc.resolve(item.offset)))
            .scrollIntoView(),
        );
      }
    },
    [focusedEditorId, getEditor],
  );

  const firstNodeInViewPort = headingNodes?.find(
    (r) => r.hasContentInsideViewport,
  );

  return (
    <div className="note-outline_container flex flex-col">
      {(!headingNodes || headingNodes.length === 0) && (
        <span className="font-light">{'<No headings found>'}</span>
      )}
      {headingNodes?.map((r, i) => {
        let isQuiet: Parameters<typeof ActionButton>[0]['isQuiet'] = 'hoverBg';
        if (firstNodeInViewPort === r) {
          isQuiet = false;
        }
        if (r.isActive) {
          isQuiet = false;
        }

        return (
          <ActionButton
            isQuiet={isQuiet}
            variant={r.isActive ? 'primary' : 'secondary'}
            ariaLabel={r.title}
            key={r.title + i}
            onPress={() => {
              onExecuteItem(r);
            }}
            style={{
              paddingLeft: 12 * (r.level - 1),
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <ButtonContent
              text={r.title || `<Empty heading-${r.level}>`}
              textClassName={cx('text-sm truncate', !r.title && 'font-light')}
            />
          </ActionButton>
        );
      })}
    </div>
  );
}
