import './aside.css';
import React, { useContext } from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { EditorManagerContext } from 'bangle-io/app/workspace2/EditorManager';

export function Aside() {
  const { editorManagerState, dispatch } = useContext(EditorManagerContext);
  const { sidebar } = editorManagerState;
  const toggleTheme = () =>
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
  const toggleSidebar = () =>
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
  return (
    <>
      <ActivityBar />
      {sidebar ? (
        <FileBrowser toggleTheme={toggleTheme} toggleSidebar={toggleSidebar} />
      ) : null}
    </>
  );
}
