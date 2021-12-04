import React from 'react';

import { keyDisplayValue } from '@bangle.io/config';
import { Extension, SidebarType } from '@bangle.io/extension-registry';
import { FolderIcon } from '@bangle.io/ui-components';

import { IframeNoteBrowserSidebar } from './IframeNoteBrowserSidebar';
import { NoteBrowserActionHandler } from './NoteBrowserActionHandler';
import { NoteBrowserSidebar } from './NoteBrowserSidebar';

const extensionName = 'bangle-io-note-browser';
const key = 'Mod-e';
const sidebars: SidebarType[] = [
  {
    name: 'sidebar::bangle-io-note-browser:note-browser',
    title: '🗒 Notes browser',
    hint: `Note browser\n` + keyDisplayValue(key),
    activitybarIcon: React.createElement(FolderIcon, {}),
    ReactComponent: NoteBrowserSidebar,
  },
];

if (
  typeof window !== 'undefined' &&
  localStorage.getItem('experiment/iframe')
) {
  sidebars.push({
    name: 'sidebar::bangle-io-note-browser:iframe-note-browser',
    title: '🗒 Iframe Notes browser',
    hint: `Note browser\n` + keyDisplayValue(key),
    activitybarIcon: React.createElement(FolderIcon, {}),
    ReactComponent: IframeNoteBrowserSidebar,
  });
}

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: NoteBrowserActionHandler,
    actions: [
      {
        name: 'action::bangle-io-note-browser:toggle-note-browser',
        title: 'Toggle Notes Browser',
        keybinding: key,
      },
    ],
    sidebars,
  },
});

export default extension;
