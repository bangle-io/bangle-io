import { PluginKey } from '@bangle.dev/core';

import { SliceKey } from '@bangle.io/api';
import type { SearchResultItem } from '@bangle.io/search-pm-node';

export const searchPluginKey = new PluginKey('search-plugin');
export const CONCURRENCY = 10;

export const SHOW_SEARCH_SIDEBAR_OPERATION =
  'operation::@bangle.io/search-notes:show-search-sidebar';

export const SIDEBAR_NAME = 'sidebar::@bangle.io/search-notes:search-notes';
export const extensionName = '@bangle.io/search-notes';
export interface SearchNotesExtensionState {
  searchQuery: string;
  pendingSearch: boolean;
  searchResults: SearchResultItem[] | null;
}

export type SearchNotesActions = {
  name: `action::@bangle.io/search-notes:update-state`;
  value: Partial<SearchNotesExtensionState>;
};

export const searchNotesSliceKey = new SliceKey<
  SearchNotesExtensionState,
  SearchNotesActions
>('slice::' + extensionName + ':slice-key');
