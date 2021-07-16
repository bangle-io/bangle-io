import { search } from '@bangle.dev/search';
import { searchPluginKey } from './plugin-key';

export function searchPlugin({ metadata: { wsPath } = {} }: { metadata: any }) {
  return search.plugins({
    query: undefined,
    key: searchPluginKey,
  });
}
