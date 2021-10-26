import { search } from '@bangle.dev/search';

import { searchPluginKey } from './constants';

export function searchPlugin({ metadata: { wsPath } = {} }: { metadata: any }) {
  return search.plugins({
    query: undefined,
    key: searchPluginKey,
  });
}
