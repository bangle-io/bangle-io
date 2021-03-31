import './left-sidebar.css';
import React, { useContext } from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { UIManagerContext } from 'bangle-io/app/UIManager';
import { useKeybindings } from 'bangle-io/app/misc/hooks';

export function LeftSidebar() {
  const { sidebar, dispatch } = useContext(UIManagerContext);

  useKeybindings(() => {
    return {
      'Mod-e': () => {
        dispatch({
          type: 'UI/TOGGLE_SIDEBAR',
        });
      },
    };
  }, [dispatch]);

  return (
    <>
      <ActivityBar />
      {sidebar ? <FileBrowser /> : null}
    </>
  );
}
