import './aside.css';
import React, { useContext } from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { EditorManagerContext } from 'bangle-io/app/workspace2/EditorManager';

export function Aside() {
  const {
    editorManagerState: { sidebar },
  } = useContext(EditorManagerContext);

  return (
    <>
      <ActivityBar />
      {sidebar ? <FileBrowser /> : null}
    </>
  );
}
