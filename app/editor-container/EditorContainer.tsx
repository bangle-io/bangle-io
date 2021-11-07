import React, { useCallback, useEffect, useState } from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';

import { ExtensionRegistry } from '@bangle.io/extension-registry';
import { Page } from '@bangle.io/ui-components';
import { cx, useDestroyRef } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

import { Editor } from './Editor';
import { EditorBar } from './EditorBar';

export function EditorContainer({
  widescreen,
  editorId,
  wsPath: incomingWsPath,
  extensionRegistry,
  setEditor,
}: {
  widescreen: boolean;
  extensionRegistry: ExtensionRegistry;
  editorId: number;
  wsPath: string | undefined;
  setEditor: (editorId: number, editor: CoreBangleEditor) => void;
}) {
  const { noteExists, wsPath } = useHandleWsPath(incomingWsPath);
  const { updateOpenedWsPaths, secondaryWsPath } = useWorkspaceContext();

  const onClose = useCallback(() => {
    updateOpenedWsPaths((openedWsPaths) =>
      openedWsPaths.updateByIndex(editorId, undefined).shrink(),
    );
  }, [updateOpenedWsPaths, editorId]);

  const isSplitEditorActive = Boolean(secondaryWsPath);

  const onPressSecondaryEditor = useCallback(() => {
    if (secondaryWsPath) {
      updateOpenedWsPaths((openedWsPath) =>
        openedWsPath.updateSecondaryWsPath(null),
      );
    } else if (wsPath) {
      updateOpenedWsPaths((openedWsPath) =>
        openedWsPath.updateSecondaryWsPath(wsPath),
      );
    }
  }, [wsPath, updateOpenedWsPaths, secondaryWsPath]);

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
        key={wsPath}
        extensionRegistry={extensionRegistry}
        editorId={editorId}
        wsPath={wsPath}
        setEditor={setEditor}
      />
    );
  }

  return (
    <div
      className={cx(
        widescreen && 'overflow-y-auto',
        'h-full w-full flex flex-col',
      )}
    >
      {widescreen && wsPath && (
        <div
          className="sticky top-0 z-10 w-full px-2 py-1 lg:px-4"
          style={{
            backgroundColor: 'var(--window-bgColor-0)',
            top: 0,
          }}
        >
          <EditorBar
            wsPath={wsPath}
            onClose={onClose}
            showSplitEditor={editorId === 0}
            onPressSecondaryEditor={onPressSecondaryEditor}
            isSplitEditorActive={isSplitEditorActive}
          />
        </div>
      )}
      <Page>{children}</Page>
    </div>
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
