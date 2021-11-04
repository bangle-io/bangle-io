import React from 'react';

import { keyDisplayValue } from '@bangle.io/config';
import { Extension } from '@bangle.io/extension-registry';
import { FolderIcon } from '@bangle.io/ui-components';

import { NoteBrowserActionHandler } from './NoteBrowserActionHandler';
import { NoteBrowserSidebar } from './NoteBrowserSidebar';

const extensionName = 'bangle-io-note-browser';
const key = 'Mod-e';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: NoteBrowserActionHandler,
    actions: [
      {
        name: 'action::bangle-io-note-browser:toggle-note-browser',
        title: 'Note Browser',
        keybinding: key,
      },
    ],
    sidebars: [
      {
        name: 'sidebar::bangle-io-note-browser:note-browser',
        title: '🗒 Notes browser',
        hint: `Note browser\n` + keyDisplayValue(key),
        activitybarIcon: React.createElement(FolderIcon, {}),
        ReactComponent: NoteBrowserSidebar,
      },
    ],
  },
});

export default extension;
