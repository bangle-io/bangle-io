import { NotesTree } from './NotesTree';
import React from 'react';
import { ButtonIcon, Sidebar, SpinnerIcon } from 'ui-components';

export function NoteBrowserSidebar({}) {
  return (
    <Sidebar.Container className="note-browser">
      <Sidebar.Title className="mt-2 px-2">🗒 Notes browser</Sidebar.Title>
      <Sidebar.ItemContainer className="flex flex-row justify-between my-1 px-2 text-xs">
        <></>
      </Sidebar.ItemContainer>
      {/* <Sidebar.ScrollableContainer></Sidebar.ScrollableContainer> */}
      <NotesTree />
    </Sidebar.Container>
  );
}
