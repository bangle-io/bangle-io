import { search } from '@bangle.dev/search';

import { nsmApi2 } from '@bangle.io/api';

export function searchPlugin() {
  return search.plugins({
    query: undefined,
    key: nsmApi2.editor.searchPluginKey,
    className: 'B-search-notes_bangle-search-match',
  });
}
