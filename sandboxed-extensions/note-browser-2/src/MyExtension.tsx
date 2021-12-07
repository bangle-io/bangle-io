import React from 'react';

import { BangleIcon, Sidebar } from '@bangle.io/ui-components';

import { NotesTree } from './NotesTree';

export function MyExtension() {
  const insertHelloWorld = () => {
    alert('hi');
  };
  return (
    <Sidebar.Container className="note-browser">
      <div className="my-1"></div>
      <NotesTree />
    </Sidebar.Container>
  );
}
