import { COMMAND_PALETTE, FILE_PALETTE } from 'app/Palette/index';
import React, { useContext } from 'react';
import { CloseIcon } from 'ui-components';
import { UIManagerContext } from 'ui-context';
import { cx } from 'utils/index';
import { resolvePath } from 'workspace';
import { Editor } from './Editor';

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

function EmptyEditorPage() {
  const { dispatch } = useContext(UIManagerContext);

  return (
    <>
      <button
        onClick={() => {
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: FILE_PALETTE },
          });
        }}
        className="w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Open a file
      </button>
      <button
        onClick={() => {
          dispatch({
            type: 'UI/CHANGE_PALETTE_TYPE',
            value: { type: COMMAND_PALETTE, initialQuery: 'new file' },
          });
        }}
        className="ml-3 w-full mt-6 sm:w-auto flex-none bg-gray-800 hover:bg-gray-600 text-white text-lg leading-6 font-semibold py-3 px-6 border border-transparent rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-gray-900 focus:outline-none transition-colors duration-200"
      >
        Create a file
      </button>
    </>
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
