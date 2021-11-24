import React, { useCallback, useEffect, useState } from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';

import { useActionContext } from '@bangle.io/action-context';
import {
  CORE_ACTIONS_CLOSE_EDITOR,
  CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
} from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { useEditorManagerContext } from '@bangle.io/editor-manager-context';
import { Page } from '@bangle.io/ui-components';
import { cx, useDestroyRef } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

import { EditorBar } from './EditorBar';

export function EditorContainer({
  widescreen,
  editorId,
  wsPath: incomingWsPath,
}: {
  widescreen: boolean;
  editorId: number;
  wsPath: string | undefined;
}) {
  const { noteExists, wsPath } = useHandleWsPath(incomingWsPath);
  const { secondaryWsPath } = useWorkspaceContext();
  const { dispatchAction } = useActionContext();
  const { setEditor, focusedEditorId } = useEditorManagerContext();

  const isSplitEditorOpen = Boolean(secondaryWsPath);

  const onPressSecondaryEditor = useCallback(() => {
    dispatchAction({
      name: CORE_ACTIONS_TOGGLE_EDITOR_SPLIT,
    });
  }, [dispatchAction]);

  const onClose = useCallback(() => {
    dispatchAction({
      name: CORE_ACTIONS_CLOSE_EDITOR,
      value: editorId,
    });
  }, [dispatchAction, editorId]);

  const onEditorReady = useCallback(
    (editor: CoreBangleEditor) => {
      setEditor(editorId, editor);
      editor.focusView();
    },
    [editorId, setEditor],
  );

  let children;

  if (noteExists === 'NOT_FOUND') {
    children = (
      <div className="flex flex-col justify-center h-full px-3 align-middle">
        <h3 className="mb-8 text-xl font-bold leading-none sm:text-3xl lg:text-3xl">
          🕵️‍♀️‍ Note "{wsPath ? resolvePath(wsPath).fileName : ''}" was not found
        </h3>
      </div>
    );
  } else if (noteExists === 'NO_WS_PATH') {
    children = <div>Nothing was found here</div>;
  } else if (wsPath) {
    children = (
      <Editor
        editorId={editorId}
        wsPath={wsPath}
        onEditorReady={onEditorReady}
        className={`editor-container_editor editor-container_editor-${editorId}`}
      />
    );
  }

  return (
    <Page
      headerBgColor="var(--window-bgColor-0) "
      stickyHeader={Boolean(widescreen)}
      header={
        widescreen &&
        wsPath && (
          <EditorBar
            isActive={focusedEditorId === editorId}
            dispatchAction={dispatchAction}
            wsPath={wsPath}
            onClose={onClose}
            showSplitEditor={editorId === 0}
            onPressSecondaryEditor={onPressSecondaryEditor}
            isSplitEditorOpen={isSplitEditorOpen}
          />
        )
      }
      className={cx(
        'editor-container_editor-container',
        'editor-container_editor-container-' + editorId,
        widescreen && 'overflow-y-scroll',
      )}
    >
      {children}
    </Page>
  );
}

/**
 * This exists to save a render cycle
 * when incomingWsPath changes to something else
 * and while `checkFileExists` is doing its thing
 * we let the previous wsPath stay, to avoid an unwanted flash.
 * @param {*} incomingWsPath
 * @returns
 */
export function useHandleWsPath(incomingWsPath) {
  const [wsPath, updateWsPath] = useState<string | undefined>(undefined);
  const [noteExists, updateFileExists] = useState<
    'LOADING' | 'FOUND' | 'NOT_FOUND' | 'NO_WS_PATH'
  >(incomingWsPath ? 'LOADING' : 'NO_WS_PATH');

  const { checkFileExists } = useWorkspaceContext();
  const destroyedRef = useDestroyRef();

  useEffect(() => {
    if (incomingWsPath) {
      updateFileExists('LOADING');
      checkFileExists(incomingWsPath).then((r) => {
        if (!destroyedRef.current) {
          if (r === true) {
            updateFileExists('FOUND');
          } else {
            updateFileExists('NOT_FOUND');
          }
          updateWsPath(incomingWsPath);
        }
      });
    }
    if (incomingWsPath == null && wsPath) {
      updateFileExists('NO_WS_PATH');
      updateWsPath(undefined);
    }
  }, [incomingWsPath, checkFileExists, wsPath, destroyedRef]);

  return { noteExists, wsPath };
}
