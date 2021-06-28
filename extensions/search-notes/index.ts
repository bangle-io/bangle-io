import React from 'react';
import { Extension } from 'extension-registry/index';
import { SearchNotesSidebar } from './SearchNotesSidebar';
import { SearchIcon } from 'ui-components/index';
const extensionName = 'search-notes';

const extension = Extension.create({
  name: extensionName,
  application: {
    sidebars: [
      {
        name: '@sidebar/' + extensionName + '/search-notes',
        hint: 'Search notes',
        icon: React.createElement(SearchIcon, {}),
        ReactComponent: SearchNotesSidebar,
      },
    ],
  },
});

export default extension;
