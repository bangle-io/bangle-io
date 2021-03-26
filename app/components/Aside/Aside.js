import './aside.css';
import React, { useContext, useEffect } from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { UIManagerContext } from 'bangle-io/app/UIManager';
import { useKeybindings } from 'bangle-io/app/misc/hooks';

export function Aside() {
  const { sidebar, dispatch } = useContext(UIManagerContext);

  useKeybindings(() => {
    const t = Math.random();
    return {
      'Mod-e': () => {
        console.log(t);
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
