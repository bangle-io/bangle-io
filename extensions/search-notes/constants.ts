import type { SearchResultItem } from '@bangle.io/search-pm-node';

export const CONCURRENCY = 10;

export const SHOW_SEARCH_SIDEBAR_OPERATION =
  'operation::@bangle.io/search-notes:show-search-sidebar';

export const SEARCH_SIDEBAR_NAME =
  'sidebar::@bangle.io/search-notes:search-notes';
export const extensionName = '@bangle.io/search-notes';
export interface SearchNotesExtensionState {
  searchQuery: string;
  pendingSearch: boolean;
  searchResults: SearchResultItem[] | null;
  // a counter keeping track of external change to the search query
  // useful for resetting any local state
  externalInputChange: number;
}

export type SearchNotesActions =
  | {
      name: `action::@bangle.io/search-notes:update-state`;
      value: Partial<SearchNotesExtensionState>;
    }
  | {
      name: 'action::@bangle.io/search-notes:input-search-query';
      value: {
        query: string;
      };
    }
  | {
      name: 'action::@bangle.io/search-notes:external-search-query-update';
      value: {
        query: string;
      };
    };
