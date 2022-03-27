import { search } from '@bangle.dev/search';

import { searchPluginKey } from './constants';

export function searchPlugin() {
  return search.plugins({
    query: undefined,
    key: searchPluginKey,
    className: 'B-search-notes_bangle-search-match',
  });
}
