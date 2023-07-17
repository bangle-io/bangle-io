import React, { useCallback, useEffect, useState } from 'react';

import {
  useNsmSlice,
  useNsmSliceState,
  useSerialOperationContext,
} from '@bangle.io/api';
import { useNsmSliceDispatch } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  CorePalette,
  PRIMARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { Editor } from '@bangle.io/editor';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import type {
  EditorIdType,
  EternalVars,
  WsPath,
} from '@bangle.io/shared-types';
import {
  nsmEditorManagerSlice,
  toggleEditing,
} from '@bangle.io/slice-editor-manager';
import { nsmNotification } from '@bangle.io/slice-notification';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { cx, useDestroyRef } from '@bangle.io/utils';
import { fs } from '@bangle.io/workspace-info';
import { resolvePath } from '@bangle.io/ws-path';

import { Editorbar } from './Editorbar';
import { EditorIssueComp } from './EditorIssueComp';

export function EditorContainer({
  widescreen,
  editorId,
  wsPath: incomingWsPath,
  eternalVars,
}: {
  widescreen: boolean;
  editorId: EditorIdType;
  wsPath: WsPath | undefined;
  eternalVars: EternalVars;
}) {
  const { noteExists, wsPath } = useHandleWsPath(incomingWsPath);
  const { openedWsPaths } = useNsmSliceState(nsmSliceWorkspace);
  const { editingAllowed, focusedEditorId } = useNsmSliceState(
    nsmEditorManagerSlice,
  );

  const { dispatchSerialOperation } = useSerialOperationContext();
  const editorStoreDispatch = useNsmSliceDispatch(nsmEditorManagerSlice);

  const [, uiDispatch] = useNsmSlice(nsmUISlice);

  const isSplitEditorOpen = Boolean(openedWsPaths.secondaryWsPath);

  const onPressSecondaryEditor = useCallback(() => {
    dispatchSerialOperation({
      name: CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
    });
  }, [dispatchSerialOperation]);

  const onCloseEditor = useCallback(() => {
    dispatchSerialOperation({
      name: CORE_OPERATIONS_CLOSE_EDITOR,
      value: editorId,
    });
  }, [dispatchSerialOperation, editorId]);

  const openNotesPalette = useCallback(() => {
    uiDispatch(nsmUI.togglePalette(CorePalette.Notes));
  }, [uiDispatch]);

  const { editorIssue, onPressEditorIssue } = useEditorIssue(wsPath);

  const onEnableEditing = useCallback(() => {
    editorStoreDispatch(
      toggleEditing({
        editingAllowed: true,
      }),
    );
  }, [editorStoreDispatch]);

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
        eternalVars={eternalVars}
        className={`B-editor-container_editor B-editor-container_editor-${editorId}`}
      />
    );
  }

  return (
    <div
      className={cx(
        'B-editor-container_editor-container',
        'B-editor-container_editor-container-' + editorId,
        widescreen && 'overflow-y-scroll',
        'w-full h-full flex flex-col items-center',
      )}
      style={{
        backgroundColor: vars.misc.editorBg,
      }}
    >
      {wsPath && (
        <div className="w-full sticky top-0 z-10">
          {widescreen && (
            <Editorbar
              isActive={focusedEditorId === editorId}
              wsPath={wsPath}
              onClose={onCloseEditor}
              showSplitEditor={editorId === PRIMARY_EDITOR_INDEX}
              onPressSecondaryEditor={onPressSecondaryEditor}
              isSplitEditorOpen={isSplitEditorOpen}
              openNotesPalette={openNotesPalette}
              onEnableEditing={onEnableEditing}
              editingDisabled={!editingAllowed}
            />
          )}
          {editorIssue && (
            <EditorIssueComp
              className={widescreen ? '' : 'pt-3'}
              editorIssue={editorIssue}
              onPress={onPressEditorIssue}
            />
          )}
        </div>
      )}

      <div
        className={cx('w-full smallscreen:min-h-screen')}
        style={{
          maxWidth: `min(${vars.misc.pageMaxWidth}, 100vw)`,
          padding: vars.misc.pagePadding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function useEditorIssue(wsPath: WsPath | undefined) {
  const [, uiDispatch] = useNsmSlice(nsmUISlice);
  const { editorIssues } = useNsmSliceState(
    nsmNotification.nsmNotificationSlice,
  );
  const editorIssue = wsPath
    ? editorIssues.find((e) => e.wsPath === wsPath)
    : undefined;

  const { dispatchSerialOperation } = useSerialOperationContext();

  const onPressEditorIssue = useCallback(() => {
    if (!editorIssue) {
      return;
    }

    const { serialOperation } = editorIssue;

    if (serialOperation) {
      dispatchSerialOperation({ name: serialOperation });
    } else {
      uiDispatch(
        nsmUI.showGenericErrorModal({
          title: editorIssue.title,
          description: editorIssue.description,
        }),
      );
    }
  }, [uiDispatch, dispatchSerialOperation, editorIssue]);

  return { editorIssue, onPressEditorIssue };
}

/**
 * This exists to save a render cycle
 * when incomingWsPath changes to something else
 * and while `checkFileExists` is doing its thing
 * we let the previous wsPath stay, to avoid an unwanted flash.
 * @param {*} incomingWsPath
 * @returns
 */
function useHandleWsPath(incomingWsPath?: WsPath) {
  const [wsPath, updateWsPath] = useState<WsPath | undefined>(undefined);
  const [noteExists, updateFileExists] = useState<
    'LOADING' | 'FOUND' | 'NOT_FOUND' | 'NO_WS_PATH'
  >(incomingWsPath ? 'LOADING' : 'NO_WS_PATH');

  const destroyedRef = useDestroyRef();

  useEffect(() => {
    if (incomingWsPath) {
      updateFileExists('LOADING');
      fs.fileExists(incomingWsPath).then(
        (r) => {
          if (!destroyedRef.current) {
            if (r) {
              updateFileExists('FOUND');
            } else {
              updateFileExists('NOT_FOUND');
            }
            updateWsPath(incomingWsPath);
          }
        },
        (error) => {
          // silence any errors here as other part of code will handle them
        },
      );
    }
    if (incomingWsPath == null && wsPath) {
      updateFileExists('NO_WS_PATH');
      updateWsPath(undefined);
    }
  }, [incomingWsPath, wsPath, destroyedRef]);

  return { noteExists, wsPath };
}
