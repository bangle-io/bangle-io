import { COMMAND_PALETTE, FILE_PALETTE } from 'app/Palette/index';
import React, { useContext } from 'react';
import { CloseIcon } from 'ui-components';
import { UIManagerContext } from 'ui-context';
import { cx } from 'utils/index';
import { resolvePath } from 'workspace';
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
  return (
    <div className={cx('bangle-editor-area', className)}>
      {wsPath && showTabs ? <Tab wsPath={wsPath} onClose={onClose} /> : null}
      <div className={cx('bangle-editor-container', showTabs && 'has-tabs')}>
        {wsPath ? (
          <Editor
            // Key is used to reload the editor when wsPath changes
            key={wsPath}
            editorId={editorId}
            wsPath={wsPath}
            // whenever paletteType goes undefined focus back on editor
            grabFocus={grabFocus}
          />
        ) : (
          <EmptyEditorPage />
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
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
