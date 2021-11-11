import React, { useCallback, useEffect, useState } from 'react';

import { useActionContext } from '@bangle.io/action-context';
import { ButtonIcon, Sidebar, SpinnerIcon } from '@bangle.io/ui-components';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { useHighlightEditors, useSearchNotesState } from '../hooks';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';

export function SearchNotesSidebar() {
  const { dispatchAction } = useActionContext();
  const [
    { pendingSearch, searchResults, searchQuery },
    updateSearchNotesState,
  ] = useSearchNotesState();
  const { wsName } = useWorkspaceContext();
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);

  useEffect(() => {
    updateCollapseAllCounter(0);
  }, [searchQuery, wsName]);

  const updateSearchQuery = useCallback(
    (query) => {
      updateSearchNotesState((state) => ({
        ...state,
        searchQuery: query,
      }));
    },
    [updateSearchNotesState],
  );

  useHighlightEditors();

  if (!wsName) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span
          className="text-sm font-extrabold cursor-pointer textColor-1"
          onClick={() => {
            dispatchAction({
              name: 'action::bangle-io-core-palettes:TOGGLE_WORKSPACE_PALETTE',
            });
          }}
        >
          Please open a workspace to search
        </span>
      </div>
    );
  }

  return (
    <Sidebar.Container className="search-notes">
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
