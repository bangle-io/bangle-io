import React, { useEffect, useRef, useState } from 'react';

import type { BangleEditor as CoreBangleEditor } from '@bangle.dev/core';

import { ExtensionRegistry } from '@bangle.io/extension-registry';
import { Page } from '@bangle.io/ui-components';
import { cx, useDestroyRef } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';
import { resolvePath } from '@bangle.io/ws-path';

import { Editor } from './Editor';

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

  let children;

  if (noteExists === 'NOT_FOUND') {
    children = (
      <div className="h-full flex flex-col justify-center align-middle px-3">
        <h3 className="sm:text-3xl lg:text-3xl mb-8 text-xl font-bold leading-none">
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

  return <Page className={cx(widescreen && 'overflow-auto')}>{children}</Page>;
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
