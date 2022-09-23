import React, { useCallback, useEffect, useState } from 'react';

import { Editorbar } from '@bangle.io/activitybar';
import {
  ui,
  useBangleStoreContext,
  useSerialOperationContext,
} from '@bangle.io/api';
import {
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  CorePalette,
  PRIMARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { Editor } from '@bangle.io/editor';
import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { EditorIdType } from '@bangle.io/shared-types';
import { useEditorManagerContext } from '@bangle.io/slice-editor-manager';
import { getEditorIssue } from '@bangle.io/slice-notification';
import { togglePaletteType } from '@bangle.io/slice-ui';
import {
  checkFileExists,
  useWorkspaceContext,
} from '@bangle.io/slice-workspace';
import { Page } from '@bangle.io/ui-components';
import { cx, useDestroyRef } from '@bangle.io/utils';
import { resolvePath } from '@bangle.io/ws-path';

export function EditorContainer({
  widescreen,
  editorId,
  wsPath: incomingWsPath,
}: {
  widescreen: boolean;
  editorId: EditorIdType;
  wsPath: string | undefined;
}) {
  const bangleStore = useBangleStoreContext();
  const { noteExists, wsPath } = useHandleWsPath(incomingWsPath);
  const { openedWsPaths } = useWorkspaceContext();
  const { focusedEditorId } = useEditorManagerContext();
  const { dispatchSerialOperation } = useSerialOperationContext();
  const extensionRegistry = useExtensionRegistryContext();

  const isSplitEditorOpen = Boolean(openedWsPaths.secondaryWsPath);

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

  const openNotesPalette = useCallback(() => {
    togglePaletteType(CorePalette.Notes)(
      bangleStore.state,
      bangleStore.dispatch,
    );
  }, [bangleStore]);

  const editorIssue = wsPath
    ? getEditorIssue(wsPath)(bangleStore.state)
    : undefined;

  const onPressEditorIssue = useCallback(() => {
    if (!editorIssue) {
      return;
    }

    const { serialOperation } = editorIssue;

    if (serialOperation) {
      dispatchSerialOperation({ name: serialOperation });
    } else {
      ui.showGenericErrorModal({
        title: editorIssue.title,
        description: editorIssue.description,
      })(bangleStore.state, bangleStore.dispatch);
    }
  }, [bangleStore, dispatchSerialOperation, editorIssue]);

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
        extensionRegistry={extensionRegistry}
        className={`B-editor-container_editor B-editor-container_editor-${editorId}`}
      />
    );
  }

  return (
    <Page
      widescreen={widescreen}
      headerBgColor="var(--BV-window-bg-color-0) "
      stickyHeader={Boolean(widescreen)}
      header={
        widescreen &&
        wsPath && (
          <Editorbar
            editorIssue={editorIssue}
            isActive={focusedEditorId === editorId}
            wsPath={wsPath}
            onClose={onClose}
            showSplitEditor={editorId === PRIMARY_EDITOR_INDEX}
            onPressSecondaryEditor={onPressSecondaryEditor}
            isSplitEditorOpen={isSplitEditorOpen}
            openNotesPalette={openNotesPalette}
            onPressEditorIssue={onPressEditorIssue}
          />
        )
      }
      className={cx(
        'B-editor-container_editor-container',
        'B-editor-container_editor-container-' + editorId,
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

  const bangleStore = useBangleStoreContext();

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
            if (r) {
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
