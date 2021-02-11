import './aside.css';
import React, { useContext } from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { UIManagerContext } from 'bangle-io/app/ui/UIManager';
import { useKeybindings } from 'bangle-io/app/misc/keybinding-helper';

export function Aside() {
  const { sidebar, dispatch } = useContext(UIManagerContext);
  useKeybindings(() => ({
    'Mod-e': () => {
      dispatch({
        type: 'UI/TOGGLE_SIDEBAR',
      });
    },
  }));

  return (
    <>
      <ActivityBar />
      {sidebar ? <FileBrowser /> : null}
    </>
  );
}
