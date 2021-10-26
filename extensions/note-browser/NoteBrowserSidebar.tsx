import React from 'react';

import { Sidebar } from '@bangle.io/ui-components';

import { NotesTree } from './NotesTree';

export function NoteBrowserSidebar({}) {
  return (
    <Sidebar.Container className="note-browser">
      <Sidebar.Title className="px-2 mt-2">🗒 Notes browser</Sidebar.Title>
      <div className="my-1"></div>
      <NotesTree />
    </Sidebar.Container>
  );
}
