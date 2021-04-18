import React, { useEffect, useState } from 'react';
import { CloseIcon } from 'ui-components';
import { cx } from 'utils/index';
import { checkFileExists, resolvePath } from 'workspace/index';
import { Editor } from './Editor';
import { EmptyEditorPage } from './EmptyEditorPage';

/**
 * This exists to save a render cycle
 * when incomingWsPath changes to something else
 * and while `checkFileExists` is doing its thing
 * we let the previous wsPath stay, to avoid flash.
 * @param {*} incomingWsPath
 * @returns
 */
function useHandleWsPath(incomingWsPath) {
  const [wsPath, updateWsPath] = useState(undefined);
  const [fileExists, updateFileExists] = useState(undefined);

  useEffect(() => {
    let destroyed = false;
    if (incomingWsPath) {
      checkFileExists(incomingWsPath).then((r) => {
        if (!destroyed) {
          updateFileExists(r);
          updateWsPath(incomingWsPath);
        }
      });
    }
    if (incomingWsPath == null && wsPath) {
      updateFileExists(undefined);
      updateWsPath(undefined);
    }
    return () => {
      destroyed = true;
    };
  }, [incomingWsPath, wsPath]);

  return { fileExists, wsPath };
}

export function EditorArea({
  className,
  editorId,
  showTabs,
  wsPath: incomingWsPath,
  grabFocus,
  onClose,
}) {
  const { fileExists, wsPath } = useHandleWsPath(incomingWsPath);
  return (
    <div className={cx('bangle-editor-area', className)}>
      {wsPath && showTabs ? <Tab wsPath={wsPath} onClose={onClose} /> : null}
      <div className={cx('bangle-editor-container', showTabs && 'has-tabs')}>
        {fileExists && wsPath && (
          <Editor
            // Key is used to reload the editor when wsPath changes
            key={wsPath}
            editorId={editorId}
            wsPath={wsPath}
            // whenever paletteType goes undefined focus back on editor
            grabFocus={grabFocus}
          />
        )}
        {wsPath && fileExists === false && (
          <h3 className="text-xl sm:text-3xl lg:text-3xl leading-none font-bold  mb-8">
            🕵️‍♀️‍ File "{resolvePath(wsPath).fileName}" was not found
          </h3>
        )}
        {!wsPath && <EmptyEditorPage />}
      </div>
    </div>
  );
}

function Tab({ wsPath, onClose }) {
  return (
    <div className="editor-tab">
      <span>{resolvePath(wsPath).fileName}</span>
      <button type="button" onClick={onClose} className={`focus:outline-none`}>
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
