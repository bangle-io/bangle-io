import { PluginKey } from '@bangle.dev/core';

export const searchPluginKey = new PluginKey('search-plugin');
export const DEBOUNCE_WAIT = 250;
export const DEBOUNCE_MAX_WAIT = 2000;
export const CONCURRENCY = 10;

// An array of string where every even item is a match that needs to be highlighted
// NOTE: it can have empty strings.
// for example ['aa', 'bb', 'cc'] , here 'bb' will be highlight in the search context
export type HighlightTextType = Array<string>;

export interface SearchResultItem {
  wsPath: string;
  matches: Array<{
    parent: string;
    parentPos: number;
    match: HighlightTextType;
  }>;
}

export const SHOW_SEARCH_SIDEBAR_ACTION =
  '@action/search-notes/show-search-sidebar';

export const EXECUTE_SEARCH_ACTION = '@action/search-notes/execute-search';
export const SIDEBAR_NAME = '@sidebar/search-notes/search-notes';
export const extensionName = 'search-notes';
export interface SearchNotesExtensionState {
  searchQuery: string;
  pendingSearch: boolean;
  searchResults: SearchResultItem[] | null;
}
