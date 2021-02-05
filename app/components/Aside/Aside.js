import './aside.css';
import React, { useContext } from 'react';
import { ActivityBar } from './ActivityBar';
import { FileBrowser } from './FileBrowser';
import { UIManagerContext } from 'bangle-io/app/ui/UIManager';

export function Aside() {
  const { sidebar } = useContext(UIManagerContext);

  return (
    <>
      <ActivityBar />
      {sidebar ? <FileBrowser /> : null}
    </>
  );
}
