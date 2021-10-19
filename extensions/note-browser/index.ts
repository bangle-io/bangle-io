import { keyDisplayValue } from 'config';
import { Extension } from 'extension-registry';
import React from 'react';
import { FolderIcon, QuestionIcon } from 'ui-components';
import { HelpDocuments } from './HelpDocuments';
import { NoteBrowserActionHandler } from './NoteBrowserActionHandler';
import { NoteBrowserSidebar } from './NoteBrowserSidebar';

const extensionName = 'note-browser';
const key = 'Mod-e';

const extension = Extension.create({
  name: extensionName,
  application: {
    ReactComponent: NoteBrowserActionHandler,
    actions: [
      {
        name: '@action/note-browser/toggle-note-browser',
        title: 'Note Browser',
        keybinding: key,
      },
    ],
    sidebars: [
      {
        name: '@sidebar/note-browser/note-browser',
        hint: `Note browser\n` + keyDisplayValue(key),
        icon: React.createElement(FolderIcon, {}),
        ReactComponent: NoteBrowserSidebar,
      },

      // {
      //   name: '@sidebar/note-browser/help-documents-browser',
      //   iconPlacement: 'bottom',
      //   hint: `Help`,
      //   icon: React.createElement(QuestionIcon, {}),
      //   ReactComponent: HelpDocuments,
      // },
    ],
  },
});

export default extension;
