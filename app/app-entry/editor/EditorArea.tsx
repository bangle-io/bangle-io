import { FRIENDLY_ID } from 'config';
import { useEditorManagerContext } from 'editor-manager-context';
import { useExtensionRegistryContext } from 'extension-registry';
import React, { useEffect, useState } from 'react';
import { CloseIcon } from 'ui-components';
import { cx, sleep, useDestroyRef } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { resolvePath } from 'ws-path';

import { Editor } from './Editor';
import { EmptyEditorPage } from './EmptyEditorPage';

/**
 * This exists to save a render cycle
 * when incomingWsPath changes to something else
 * and while `checkFileExists` is doing its thing
 * we let the previous wsPath stay, to avoid an unwanted flash.
 * @param {*} incomingWsPath
 * @returns
 */
function useHandleWsPath(incomingWsPath) {
  const [wsPath, updateWsPath] = useState<string | undefined>(undefined);
  const [fileExists, updateFileExists] = useState<boolean | undefined>(
    undefined,
  );
  const { checkFileExists } = useWorkspaceContext();
  const destroyedRef = useDestroyRef();

  useEffect(() => {
    if (incomingWsPath) {
      checkFileExists(incomingWsPath).then((r) => {
        if (!destroyedRef.current) {
          updateFileExists(r);
          updateWsPath(incomingWsPath);
        }
      });
    }
    if (incomingWsPath == null && wsPath) {
      updateFileExists(undefined);
      updateWsPath(undefined);
    }
  }, [incomingWsPath, checkFileExists, wsPath, destroyedRef]);

  return { fileExists, wsPath };
}

export function EditorArea({
  id,
  className,
  editorId,
  showTabs,
  wsPath: incomingWsPath,
  onClose,
}) {
  const { fileExists, wsPath } = useHandleWsPath(incomingWsPath);
  const { setEditor } = useEditorManagerContext();
  const extensionRegistry = useExtensionRegistryContext();
  const [showEmptyEditor, updateShowEmptyEditor] = useState(false);

  // prevents unwarranted flash of empty editor by waiting
  // a certain time before showing the editor.
  useEffect(() => {
    let destroyed = false;
    if (!wsPath) {
      sleep(150).then(() => {
        if (!wsPath && !destroyed) {
          updateShowEmptyEditor(true);
        }
      });
    }
    if (wsPath && showEmptyEditor) {
      updateShowEmptyEditor(false);
    }
    return () => {
      destroyed = true;
    };
  }, [wsPath, showEmptyEditor]);

  return (
    <div id={id} className={cx('bangle-editor-area', className)}>
      {wsPath && showTabs ? <Tab wsPath={wsPath} onClose={onClose} /> : null}
      <div className={cx('bangle-editor-container', showTabs && 'has-tabs')}>
        {fileExists && wsPath && extensionRegistry && (
          <>
            <Editor
              // Key is used to reload the editor when wsPath changes
              key={wsPath}
              editorId={editorId}
              wsPath={wsPath}
              setEditor={setEditor}
              extensionRegistry={extensionRegistry}
            />
          </>
        )}
        {wsPath && fileExists === false && (
          <h3 className="mb-8 text-xl font-bold leading-none sm:text-3xl lg:text-3xl">
            🕵️‍♀️‍ Note "{wsPath ? resolvePath(wsPath).fileName : ''}" was not
            found
          </h3>
        )}
        {showEmptyEditor && <EmptyEditorPage />}
        {editorId === 0 && (
          <div className="flex flex-row-reverse w-full pt-4 pb-4">
            <BangleIOIcon className="w-4 h-4" isDark={false} opacity={0.6} />
            <div className="flex flex-col">
              <a
                href="https://bangle.io"
                className="text-xs "
                style={{ opacity: '0.3' }}
              >
                bangle.io
              </a>
              <span
                className="italic"
                style={{ opacity: '0.3', fontSize: '0.5rem' }}
              >
                {FRIENDLY_ID}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ wsPath, onClose }) {
  return (
    <div className="editor-tab">
      <span>{resolvePath(wsPath).fileName}</span>
      <button type="button" onClick={onClose} className={`focus:outline-none`}>
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

function BangleIOIcon(props) {
  const { isDark, opacity, ...otherProps } = props;

  const outlineShade = isDark ? '#fff' : '#999';

  const po = (
    <>
      <path
        strokeOpacity={opacity}
        d="M223.5 224.62c24.28-24.72 40.59-53.21 47.16-79.5 6.54-26.18 3.6-51.14-12.26-67.28-15.85-16.14-40.39-19.14-66.1-12.48-25.83 6.7-53.83 23.3-78.12 48.01-24.28 24.72-40.6 53.21-47.17 79.5-6.54 26.17-3.6 51.14 12.26 67.28s40.4 19.13 66.1 12.48c25.84-6.7 53.84-23.3 78.12-48.01Z"
        stroke={'#7FCEEE'}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M216.98 219.88c24.28-24.71 40.6-53.2 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.27-15.86-16.14-40.39-19.14-66.1-12.48-25.83 6.69-53.83 23.3-78.12 48-24.28 24.72-40.6 53.22-47.17 79.51-6.54 26.17-3.6 51.14 12.26 67.27 15.86 16.14 40.39 19.14 66.1 12.48 25.84-6.69 53.83-23.29 78.12-48Z"
        stroke={'#7FCEEE'}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M213.26 216.1c24.28-24.72 40.6-53.22 47.17-79.5 6.54-26.18 3.6-51.14-12.26-67.28s-40.39-19.14-66.1-12.48c-25.83 6.7-53.83 23.3-78.12 48-24.28 24.72-40.6 53.22-47.17 79.51-6.54 26.17-3.6 51.14 12.26 67.28 15.86 16.13 40.39 19.13 66.1 12.48 25.84-6.7 53.83-23.3 78.12-48.01Z"
        stroke={'#7FCEEE'}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M207.68 211.36c24.28-24.71 40.6-53.2 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.27-15.86-16.14-40.4-19.14-66.1-12.48-25.84 6.69-53.84 23.29-78.12 48-24.29 24.72-40.6 53.22-47.17 79.5-6.54 26.18-3.6 51.15 12.26 67.28 15.86 16.14 40.39 19.14 66.1 12.48 25.83-6.69 53.83-23.3 78.12-48Z"
        stroke={'#7FCEEE'}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M203.96 207.58c24.28-24.72 40.6-53.22 47.17-79.5 6.54-26.18 3.6-51.14-12.26-67.28s-40.4-19.14-66.1-12.48c-25.84 6.69-53.84 23.3-78.12 48-24.29 24.72-40.6 53.22-47.17 79.51-6.54 26.17-3.6 51.14 12.26 67.28 15.85 16.13 40.39 19.13 66.1 12.47 25.83-6.69 53.83-23.29 78.12-48Z"
        stroke={'#7FCEEE'}
        strokeWidth="10"
      />
    </>
  );

  return (
    <svg
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 320"
      {...otherProps}
    >
      <path
        strokeOpacity={opacity}
        d="M237.44 235.98c24.29-24.72 40.6-53.21 47.18-79.5 6.54-26.17 3.59-51.14-12.26-67.28-15.86-16.14-40.4-19.13-66.1-12.48-25.84 6.7-53.84 23.3-78.12 48.01-24.29 24.72-40.6 53.21-47.17 79.5-6.55 26.18-3.6 51.14 12.26 67.28 15.85 16.14 40.39 19.13 66.1 12.48 25.83-6.7 53.83-23.3 78.11-48.01Z"
        stroke={outlineShade}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M230.93 231.25c24.29-24.72 40.6-53.22 47.17-79.5 6.55-26.18 3.6-51.14-12.26-67.28-15.85-16.14-40.38-19.14-66.1-12.48-25.83 6.69-53.83 23.3-78.11 48-24.29 24.72-40.6 53.22-47.17 79.51-6.55 26.17-3.6 51.14 12.26 67.27 15.85 16.14 40.38 19.14 66.1 12.48 25.83-6.69 53.83-23.29 78.11-48Z"
        stroke={outlineShade}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M225.35 226.51c24.29-24.71 40.6-53.21 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.28-15.85-16.13-40.39-19.13-66.1-12.47-25.83 6.69-53.83 23.29-78.12 48-24.28 24.72-40.6 53.22-47.17 79.5-6.54 26.18-3.6 51.14 12.26 67.28s40.4 19.14 66.1 12.48c25.84-6.69 53.84-23.3 78.12-48Z"
        stroke={outlineShade}
        strokeWidth="10"
      />
      {po}
      <path
        strokeOpacity={opacity}
        d="M200.24 203.79c24.28-24.72 40.6-53.21 47.16-79.5 6.55-26.17 3.6-51.14-12.25-67.28-15.86-16.14-40.4-19.13-66.1-12.48-25.84 6.7-53.84 23.3-78.12 48.01-24.29 24.72-40.6 53.21-47.17 79.5-6.55 26.18-3.6 51.14 12.26 67.28 15.85 16.14 40.38 19.13 66.1 12.48 25.83-6.7 53.83-23.3 78.12-48.01Z"
        stroke={outlineShade}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M196.51 200c24.29-24.71 40.6-53.21 47.17-79.5 6.55-26.17 3.6-51.14-12.26-67.28-15.85-16.13-40.38-19.13-66.1-12.47-25.83 6.69-53.83 23.29-78.11 48-24.29 24.72-40.6 53.22-47.17 79.5-6.55 26.18-3.6 51.15 12.26 67.28 15.85 16.14 40.38 19.14 66.1 12.48 25.83-6.69 53.83-23.3 78.11-48Z"
        stroke={outlineShade}
        strokeWidth="10"
      />
      <path
        strokeOpacity={opacity}
        d="M191.86 195.27c24.29-24.72 40.6-53.21 47.17-79.5 6.54-26.17 3.6-51.14-12.26-67.28-15.85-16.14-40.39-19.14-66.1-12.48-25.83 6.7-53.83 23.3-78.12 48.01-24.28 24.72-40.6 53.21-47.17 79.5-6.54 26.17-3.59 51.14 12.27 67.28 15.85 16.13 40.38 19.13 66.1 12.48 25.83-6.7 53.83-23.3 78.11-48.01Z"
        stroke={outlineShade}
        strokeWidth="10"
      />
    </svg>
  );
}
