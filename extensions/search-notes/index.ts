import React from 'react';
import { Extension } from 'extension-registry/index';
import { SearchNotes } from './SearchNotes';
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
        ReactComponent: SearchNotes,
      },
    ],
  },
});

export default extension;
