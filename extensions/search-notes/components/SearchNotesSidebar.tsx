import React, { useEffect, useState } from 'react';

import {
  useBangleStoreContext,
  useSliceState,
} from '@bangle.io/bangle-store-context';
import { CorePalette } from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { ButtonIcon, Sidebar, SpinnerIcon } from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import { searchNotesSliceKey } from '../constants';
import { updateInputSearchQuery } from '../search-notes-slice';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';

export function SearchNotesSidebar() {
  const bangleStore = useBangleStoreContext();
  const { wsName } = useWorkspaceContext();
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);
  const {
    sliceState: {
      pendingSearch,
      searchResults,
      searchQuery,
      externalInputChange: externalChange,
    },
    store,
  } = useSliceState(searchNotesSliceKey);
  const [rawSearchQuery, updateRawSearchQuery] = useState(searchQuery || '');

  const [lastExternalChange, setLastExternalChange] = useState(externalChange);

  const localSearchQuery = useDebouncedValue(rawSearchQuery, {
    wait: 30,
  });

  useEffect(() => {
    // reset the current input state if there was an external
    // change made to the search query
    if (lastExternalChange !== externalChange) {
      setLastExternalChange(externalChange);
      updateRawSearchQuery(searchQuery);
    } else {
      if (localSearchQuery !== searchQuery) {
        // else sync the local state with the global state
        updateInputSearchQuery(localSearchQuery)(store.state, store.dispatch);
      }
    }
  }, [
    externalChange,
    searchQuery,
    localSearchQuery,
    store,
    lastExternalChange,
  ]);

  useEffect(() => {
    updateCollapseAllCounter(0);
  }, [localSearchQuery, wsName]);

  if (!wsName) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span
          className="text-sm font-extrabold cursor-pointer text-colorNeutralTextSubdued"
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
          searchQuery={rawSearchQuery}
          updateSearchQuery={updateRawSearchQuery}
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
