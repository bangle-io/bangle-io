import { Extension } from 'extension-registry/index';
import { keybindings } from 'config';
import React from 'react';
import { NoteBrowserSidebar } from './NoteBrowserSidebar';
import { FolderIcon, QuestionIcon } from 'ui-components';
import { HelpDocuments } from './HelpDocuments';

const extensionName = 'note-browser';

const extension = Extension.create({
  name: extensionName,
  application: {
    sidebars: [
      {
        name: '@sidebar/' + extensionName + '/note-browser',
        hint: `Note browser\n${keybindings.toggleNoteBrowser.displayValue}`,
        icon: React.createElement(FolderIcon, {}),
        ReactComponent: NoteBrowserSidebar,
        keybinding: keybindings.toggleNoteBrowser,
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
