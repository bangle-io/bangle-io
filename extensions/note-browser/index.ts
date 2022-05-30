import React from 'react';

import { keyDisplayValue } from '@bangle.io/config';
import { Extension } from '@bangle.io/extension-registry';
import { changeSidebar } from '@bangle.io/slice-ui';
import { FolderIcon } from '@bangle.io/ui-components';

import { NoteBrowserSidebar } from './NoteBrowserSidebar';

const extensionName = '@bangle.io/note-browser';
const key = 'Mod-e';

const extension = Extension.create({
  name: extensionName,
  application: {
    operations: [
      {
        name: 'operation::@bangle.io/note-browser:toggle-note-browser',
        title: 'Show/Hide Notes Browser',
        keybinding: key,
        keywords: [
          'hide',
          'note browser',
          'note sidebar',
          'notes sidebar',
          'all notes',
          'file',
          'files',
          'explorer',
        ],
      },
    ],
    sidebars: [
      {
        name: 'sidebar::@bangle.io/note-browser:note-browser',
        title: 'Note browser',
        hint: `Note browser\n` + keyDisplayValue(key),
        activitybarIcon: React.createElement(FolderIcon, {}),
        ReactComponent: NoteBrowserSidebar,
      },
    ],
    operationHandler() {
      return {
        handle(operation, _, bangleStore) {
          switch (operation.name) {
            case 'operation::@bangle.io/note-browser:toggle-note-browser': {
              changeSidebar('sidebar::@bangle.io/note-browser:note-browser')(
                bangleStore.state,
                bangleStore.dispatch,
              );

              return true;
            }
            default: {
              return false;
            }
          }
        },
      };
    },
  },
});

export default extension;
