import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Selection } from '@bangle.dev/pm';

import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { useSerialOperationHandler } from '@bangle.io/serial-operation-context';
import {
  getEditor,
  getEditorState,
  useEditorManagerContext,
} from '@bangle.io/slice-editor-manager';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import {
  cx,
  safeCancelIdleCallback,
  safeRequestAnimationFrame,
  safeRequestIdleCallback,
  safeScrollIntoViewIfNeeded,
} from '@bangle.io/utils';

import {
  HEADING_AUTO_SCROLL_INTO_VIEW_COOLDOWN,
  HeadingNodes,
  WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP,
  watchHeadingsPluginKey,
} from './config';

export function NoteOutline() {
  const { focusedEditorId } = useEditorManagerContext();
  const { wsName } = useWorkspaceContext();
  const [headingNodes, updateHeadingsState] = useState<
    HeadingNodes | undefined
  >();
  const store = useBangleStoreContext();

  const lastClickedOnHeading = useRef(0);

  const firstNodeInViewPort = useMemo(() => {
    return headingNodes?.find((r) => r.hasContentInsideViewport);
  }, [headingNodes]);

  useAutomaticScrollNodeIntoView(firstNodeInViewPort, lastClickedOnHeading);

  const updateHeadingNodes = useCallback(() => {
    const state =
      focusedEditorId != null && getEditorState(focusedEditorId)(store.state);
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
  }, [focusedEditorId, store]);

  useSerialOperationHandler(
    (sOperation) => {
      if (sOperation.name === WATCH_HEADINGS_PLUGIN_STATE_UPDATE_OP) {
        const editorId: unknown = sOperation.value?.editorId;
        // change is from an editor which doesnt have id or the operation
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
        focusedEditorId != null && getEditor(focusedEditorId)(store.state);
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
    [focusedEditorId, store],
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
        let isQuiet: Parameters<typeof ActionButton>[0]['isQuiet'] = 'hoverBg';
        let className = '';
        if (firstNodeInViewPort === r) {
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
            className={className}
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
