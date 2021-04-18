import React, { useContext, useEffect, useState } from 'react';
import { CloseIcon } from 'ui-components';
import { UIManagerContext } from 'ui-context';
import { cx } from 'utils/index';
import { checkFileExists, resolvePath } from 'workspace/index';
import { Editor } from './Editor';
import { EmptyEditorPage } from './EmptyEditorPage';
export function EditorArea({
  className,
  editorId,
  showTabs,
  wsPath,
  grabFocus,
  onClose,
}) {
  const [fileExists, updateFileExists] = useState(undefined);
  useEffect(() => {
    let destroyed = false;
    if (wsPath) {
      updateFileExists(false);
      checkFileExists(wsPath).then((r) => {
        if (r === true && !destroyed) {
          updateFileExists(true);
        }
        if (r === false && !destroyed) {
          updateFileExists(false);
        }
      });
    }
    return () => {
      destroyed = true;
    };
  }, [wsPath]);

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
