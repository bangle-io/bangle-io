import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Selection } from '@bangle.dev/pm';

import { nsmApi2, useSerialOperationHandler } from '@bangle.io/api';
import { Button } from '@bangle.io/ui-components';
import {
  safeCancelIdleCallback,
  safeRequestAnimationFrame,
  safeRequestIdleCallback,
  safeScrollIntoViewIfNeeded,
} from '@bangle.io/utils';

import type { HeadingNodes } from './config';
import {
  HEADING_AUTO_SCROLL_INTO_VIEW_COOLDOWN,
  WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
  watchHeadingsPluginKey,
} from './config';

export function NoteOutline() {
  const { focusedEditorId, primaryEditor } = nsmApi2.editor.useEditor();
  const { wsName } = nsmApi2.workspace.useWorkspace();
  const [headingNodes, updateHeadingsState] = useState<
    HeadingNodes | undefined
  >();

  const lastClickedOnHeading = useRef(0);

  const firstNodeInViewPort = useMemo(() => {
    return headingNodes?.find((r) => r.hasContentInsideViewport);
  }, [headingNodes]);

  useAutomaticScrollNodeIntoView(firstNodeInViewPort, lastClickedOnHeading);

  const updateHeadingNodes = useCallback(() => {
    let state =
      focusedEditorId != null &&
      nsmApi2.editor.getEditor(focusedEditorId)?.view.state;

    if (!state) {
      state = primaryEditor?.view.state;
    }

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
  }, [focusedEditorId, primaryEditor]);

  useSerialOperationHandler(
    (sOperation) => {
      if (sOperation.name === WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP) {
        const editorId: unknown = sOperation.value?.editorId;

        if (focusedEditorId == null) {
          return false;
        }

        // change is from an editor which doesnt have id or the operation
        // is for a different editorId
        if (editorId !== focusedEditorId) {
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
        focusedEditorId != null && nsmApi2.editor.getEditor(focusedEditorId);

      if (focusedEditor) {
        if (!focusedEditor || focusedEditor.destroyed) {
          return;
        }

        focusedEditor.focusView();
        const { dispatch, state } = focusedEditor.view;
        const tr = state.tr;
        lastClickedOnHeading.current = Date.now();
        dispatch(
          tr
            .setSelection(Selection.near(tr.doc.resolve(item.offset)))
            .scrollIntoView(),
        );
      }
    },
    [focusedEditorId],
  );

  // Calculate headings on initial mount
  useEffect(() => {
    updateHeadingNodes();
  }, [
    // update heading nodes when wsName changes too
    wsName,
    updateHeadingNodes,
  ]);

  return (
    <div className="note-outline_container flex flex-col">
      {(!headingNodes || headingNodes.length === 0) && (
        <span>
          🐒 No headings found!
          <br />
          <span className="font-light">
            Create heading by typing # followed by a space.
          </span>
        </span>
      )}
      {headingNodes?.map((r, i) => {
        let className = '';

        const isFirstNodeInViewPort = firstNodeInViewPort === r;

        if (isFirstNodeInViewPort) {
          className = 'note-outline_first-node-in-viewport';
        }
        if (r.isActive) {
        }

        return (
          <Button
            variant={
              r.isActive
                ? 'solid'
                : isFirstNodeInViewPort
                ? 'soft'
                : 'transparent'
            }
            tone={r.isActive ? 'promote' : 'neutral'}
            ariaLabel={r.title}
            size="sm"
            className={className}
            key={r.title + i}
            onPress={() => {
              onExecuteItem(r);
            }}
            justifyContent="flex-start"
            style={{
              paddingLeft: 12 * (r.level - 1),
              paddingTop: 4,
              paddingBottom: 4,
              whiteSpace: 'nowrap',
            }}
            text={
              <span className="pl-1">
                {r.title || `<Empty heading-${r.level}>`}
              </span>
            }
          />
        );
      })}
    </div>
  );
}

export function useAutomaticScrollNodeIntoView(
  firstNodeInViewPort: HeadingNodes[0] | undefined,
  lastClickedOnHeading: React.MutableRefObject<number>,
) {
  const scrollIntoViewInProgress = useRef(false);

  const scrollHeadingNodeIntoView = useCallback(() => {
    if (
      Date.now() - lastClickedOnHeading.current <
      HEADING_AUTO_SCROLL_INTO_VIEW_COOLDOWN
    ) {
      return;
    }
    const node = document.querySelector(
      '.note-outline_container .note-outline_first-node-in-viewport',
    );

    node instanceof HTMLElement &&
      safeRequestAnimationFrame(() => safeScrollIntoViewIfNeeded(node, false));
    scrollIntoViewInProgress.current = false;
  }, [lastClickedOnHeading]);

  useEffect(() => {
    let callbackId: number | null = null;

    if (!scrollIntoViewInProgress.current) {
      scrollIntoViewInProgress.current = true;
      callbackId = safeRequestIdleCallback(scrollHeadingNodeIntoView);
    }

    return () => {
      if (callbackId != null) {
        safeCancelIdleCallback(callbackId);
      }
      scrollIntoViewInProgress.current = false;
    };
  }, [firstNodeInViewPort, scrollHeadingNodeIntoView]);
}
