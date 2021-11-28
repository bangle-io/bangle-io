import React, { useCallback, useEffect, useRef, useState } from 'react';

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

const CLICK_COOLDOWN_TIME = 1500;

export function NoteOutline() {
  const {
    focusedEditorId,
    getEditor,
    getEditorState,
    isFocusedEditorScrolling,
  } = useEditorManagerContext();
  const lastClickedRef = useRef<number>(0);

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
  }, [
    // update heading nodes when wsName changes too
    wsName,
    updateHeadingNodes,
  ]);

  useActionHandler(
    (action) => {
      if (action.name === WATCH_HEADINGS_PLUGIN_STATE_UPDATE_ACTION) {
        const editorId: unknown = action.value?.editorId;
        // change is from an editor which doesnt have id or the action
        // is for a different editorId
        if (typeof editorId !== 'number' || editorId !== focusedEditorId) {
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

  const firstNodeInViewport = headingNodes?.find(
    (r) => r.hasContentInsideViewport,
  );

  useEffect(() => {
    if (Date.now() - lastClickedRef.current > CLICK_COOLDOWN_TIME) {
      const element = document.querySelector(
        '.note-outline_container .note-outline_first-node-in-viewport',
      );
      if (element) {
        requestAnimationFrame(() => {
          (element as any).scrollIntoViewIfNeeded();
        });
      }
    }
  }, [isFocusedEditorScrolling]);

  return (
    <div className="note-outline_container flex flex-col">
      {(!headingNodes || headingNodes.length === 0) && (
        <span className="font-light">{'<No headings found>'}</span>
      )}
      {headingNodes?.map((r, i) => {
        let isQuiet: Parameters<typeof ActionButton>[0]['isQuiet'] = 'hoverBg';
        let className = '';
        if (firstNodeInViewport === r) {
          isQuiet = false;
          className = 'note-outline_first-node-in-viewport';
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
            className={className}
            onPress={() => {
              onExecuteItem(r);
              lastClickedRef.current = Date.now();
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
