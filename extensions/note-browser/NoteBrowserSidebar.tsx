import React from 'react';
import { Sidebar } from 'ui-components';

import { NotesTree } from './NotesTree';

export function NoteBrowserSidebar({}) {
  return (
    <Sidebar.Container className="note-browser">
      <Sidebar.Title className="mt-2 px-2">🗒 Notes browser</Sidebar.Title>
      <div className="my-1"></div>
      <NotesTree />
    </Sidebar.Container>
  );
}
