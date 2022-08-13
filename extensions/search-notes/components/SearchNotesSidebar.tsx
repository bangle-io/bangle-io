import React, { useCallback, useEffect, useState } from 'react';

import {
  useBangleStoreContext,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import { CorePalette } from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { ButtonIcon, Sidebar, SpinnerIcon } from '@bangle.io/ui-components';

import { searchNotesSliceKey } from '../constants';
import { updateSliceState } from '../search-notes-slice';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';

export function SearchNotesSidebar() {
  const bangleStore = useBangleStoreContext();
  const { wsName } = useWorkspaceContext();
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);
  const {
    sliceState: { pendingSearch, searchResults, searchQuery },
    store,
  } = useSliceState(searchNotesSliceKey);

  useEffect(() => {
    updateCollapseAllCounter(0);
  }, [searchQuery, wsName]);

  const updateSearchQuery = useCallback(
    (query) => {
      updateSliceState({ searchQuery: query })(store.state, store.dispatch);
    },
    [store],
  );

  if (!wsName) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span
          className="text-sm font-extrabold cursor-pointer"
          style={{ color: 'var(--BV-text-color-1)' }}
          onClick={() => {
            togglePaletteType(CorePalette.Workspace)(
              bangleStore.state,
              bangleStore.dispatch,
            );
          }}
        >
          Please open a workspace to search
        </span>
      </div>
    );
  }

  return (
    <Sidebar.Container className="B-search-notes_search-notes">
      <Sidebar.ItemContainer className="px-2 mt-2">
        <SearchInput
          searchQuery={searchQuery}
          updateSearchQuery={updateSearchQuery}
        />
      </Sidebar.ItemContainer>
      <Sidebar.ItemContainer className="flex flex-row justify-between px-2 my-1 text-xs">
        {searchResults && (
          <span className="">
            {searchResults.length === 0
              ? 'No match found'
              : `Found ${searchResults.length} notes`}
          </span>
        )}
        {searchResults && (
          <ButtonIcon
            onClick={() => {
              updateCollapseAllCounter((c) => c + 1);
            }}
          >
            Collapse all
          </ButtonIcon>
        )}
        {pendingSearch && (
          <>
            <span className="">Searching </span>
            <span className="w-3 h-3 mr-2">
              <SpinnerIcon />
            </span>
          </>
        )}
      </Sidebar.ItemContainer>
      <Sidebar.ScrollableContainer>
        {searchResults && (
          <SearchResults
            results={searchResults}
            collapseAllCounter={collapseAllCounter}
          />
        )}
      </Sidebar.ScrollableContainer>
    </Sidebar.Container>
  );
}
