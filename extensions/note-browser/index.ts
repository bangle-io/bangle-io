import { Extension } from 'extension-registry/index';
import React from 'react';
import { NoteBrowserSidebar } from './NoteBrowserSidebar';
import { FolderIcon, QuestionIcon } from 'ui-components';
import { HelpDocuments } from './HelpDocuments';

const extensionName = 'note-browser';

const extension = Extension.create({
  name: extensionName,

  application: {
    actions: [
      {
        name: '@action/note-browser/show-note-browser',
        title: 'Note Browser',
        keybinding: 'Mod-e',
      },
    ],
    sidebars: [
      {
        name: '@sidebar/' + extensionName + '/note-browser',
        hint: `Note browser`,
        icon: React.createElement(FolderIcon, {}),
        ReactComponent: NoteBrowserSidebar,
      },

      {
        name: '@sidebar/' + extensionName + '/help-documents-browser',
        iconPlacement: 'bottom',
        hint: `Help`,
        icon: React.createElement(QuestionIcon, {}),
        ReactComponent: HelpDocuments,
      },
    ],
  },
});

export default extension;
