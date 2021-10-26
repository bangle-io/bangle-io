import { useActionContext } from 'action-context';
import React, { useCallback, useEffect, useState } from 'react';
import { ButtonIcon, Sidebar, SpinnerIcon } from 'ui-components';
import { useWorkspaceContext } from 'workspace-context';

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
      <div className="h-full flex flex-col items-center justify-center">
        <span
          className="text-sm font-extrabold b-text-color-lighter cursor-pointer"
          onClick={() => {
            dispatchAction({
              name: '@action/core-palettes/TOGGLE_WORKSPACE_PALETTE',
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
      <Sidebar.Title className="mt-2 px-2">🔍 Search notes</Sidebar.Title>
      <Sidebar.ItemContainer className="mt-2 px-2">
        <SearchInput
          searchQuery={searchQuery}
          updateSearchQuery={updateSearchQuery}
        />
      </Sidebar.ItemContainer>
      <Sidebar.ItemContainer className="flex flex-row justify-between my-1 px-2 text-xs">
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
            <span className="h-3 w-3 mr-2">
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
