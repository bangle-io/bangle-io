import { ActionContext } from 'action-context';
import React, { useContext, useEffect, useState } from 'react';
import { ButtonIcon, Sidebar, SpinnerIcon } from 'ui-components/index';
import { useWorkspaceContext } from 'workspace-context';
import { useSearchNotes } from './hooks';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';

export function SearchNotesSidebar() {
  const { dispatchAction } = useContext(ActionContext);
  const [query, updateQuery] = useState('');
  const { wsName } = useWorkspaceContext();
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);
  const { results, pendingSearch } = useSearchNotes(query);

  useEffect(() => {
    updateCollapseAllCounter(0);
  }, [query, wsName]);

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
      <Sidebar.Title className="mt-2 px-2">Search notes</Sidebar.Title>
      <Sidebar.ItemContainer className="mt-2 px-2">
        <SearchInput updateQuery={updateQuery} query={query} />
      </Sidebar.ItemContainer>
      <Sidebar.ItemContainer className="flex flex-row justify-between my-1 px-2 text-xs">
        {results && (
          <span className="">
            {results.length === 0
              ? 'No match found'
              : `Found ${results.length} notes`}
          </span>
        )}
        {results && (
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
        {results && (
          <SearchResults
            results={results}
            collapseAllCounter={collapseAllCounter}
          />
        )}
      </Sidebar.ScrollableContainer>
    </Sidebar.Container>
  );
}
