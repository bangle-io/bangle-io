import { PluginKey } from '@bangle.dev/core';

import type { SearchResultItem } from '@bangle.io/search-pm-node';

export const searchPluginKey = new PluginKey('search-plugin');
export const DEBOUNCE_WAIT = 250;
export const DEBOUNCE_MAX_WAIT = 2000;
export const CONCURRENCY = 10;

export const SHOW_SEARCH_SIDEBAR_OPERATION =
  'operation::bangle-io-search-notes:show-search-sidebar';

export const EXECUTE_SEARCH_OPERATION =
  'operation::bangle-io-search-notes:execute-search';
export const SIDEBAR_NAME = 'sidebar::bangle-io-search-notes:search-notes';
export const extensionName = 'bangle-io-search-notes';
export interface SearchNotesExtensionState {
  searchQuery: string;
  pendingSearch: boolean;
  searchResults: SearchResultItem[] | null;
}
