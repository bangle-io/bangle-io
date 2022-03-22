import React, { useCallback, useEffect, useState } from 'react';

import { editor, useSerialOperationContext } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
} from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { useEditorManagerContext } from '@bangle.io/slice-editor-manager';
import {
  checkFileExists,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { Page } from '@bangle.io/ui-components';
import { cx, useDestroyRef } from '@bangle.io/utils';
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
  const { openedWsPaths } = useWorkspaceContext();
  const { focusedEditorId } = useEditorManagerContext();
  const { dispatchSerialOperation } = useSerialOperationContext();

  const isSplitEditorOpen = openedWsPaths.openCount > 0;

  const onPressSecondaryEditor = useCallback(() => {
    dispatchSerialOperation({
      name: CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
    });
  }, [dispatchSerialOperation]);

  const onClose = useCallback(() => {
    dispatchSerialOperation({
      name: CORE_OPERATIONS_CLOSE_EDITOR,
      value: editorId,
    });
  }, [dispatchSerialOperation, editorId]);

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
        className={`editor-container_editor editor-container_editor-${editorId}`}
      />
    );
  }

  return (
    <Page
      widescreen={widescreen}
      headerBgColor="var(--window-bgColor-0) "
      stickyHeader={Boolean(widescreen)}
      header={
        widescreen &&
        wsPath && (
          <EditorBar
            isActive={focusedEditorId === editorId}
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
export function useHandleWsPath(incomingWsPath?: string) {
  const [wsPath, updateWsPath] = useState<string | undefined>(undefined);
  const [noteExists, updateFileExists] = useState<
    'LOADING' | 'FOUND' | 'NOT_FOUND' | 'NO_WS_PATH'
  >(incomingWsPath ? 'LOADING' : 'NO_WS_PATH');

  const { bangleStore } = useWorkspaceContext();
  const destroyedRef = useDestroyRef();

  useEffect(() => {
    if (incomingWsPath) {
      updateFileExists('LOADING');
      checkFileExists(incomingWsPath)(
        bangleStore.state,
        bangleStore.dispatch,
        bangleStore,
      ).then(
        (r) => {
          if (!destroyedRef.current) {
            if (r === true) {
              updateFileExists('FOUND');
            } else {
              updateFileExists('NOT_FOUND');
            }
            updateWsPath(incomingWsPath);
          }
        },
        () => {
          // silence any errors here as other part of code will handle them
        },
      );
    }
    if (incomingWsPath == null && wsPath) {
      updateFileExists('NO_WS_PATH');
      updateWsPath(undefined);
    }
  }, [incomingWsPath, bangleStore, wsPath, destroyedRef]);

  return { noteExists, wsPath };
}
