import { search } from '@bangle.dev/search';
import { useActionContext } from 'action-context';
import { useEditorManagerContext } from 'editor-manager-context';
import React, { useEffect, useState } from 'react';
import { ButtonIcon, Sidebar, SpinnerIcon } from 'ui-components';
import { useWorkspaceContext } from 'workspace-context';
import { useSearchNotes, useSearchNotesState } from '../hooks';
import { searchPluginKey } from '../constants';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';

export function SearchNotesSidebar() {
  const { dispatchAction } = useActionContext();
  const { forEachEditor } = useEditorManagerContext();
  const [searchNotesState] = useSearchNotesState();
  const [query, updateQuery] = useState(searchNotesState.initialQuery);

  const { wsName } = useWorkspaceContext();
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);
  const { results, pendingSearch } = useSearchNotes(query);

  useEffect(() => {
    updateCollapseAllCounter(0);
  }, [query, wsName]);

  useEffect(() => {
    // if initial query changes (externally someone sets the search query)
    // update the current query
    updateQuery(searchNotesState.initialQuery);
  }, [searchNotesState.initialQuery]);

  useEffect(() => {
    if (results && results.length > 0 && query) {
      forEachEditor((editor) => {
        if (editor?.destroyed === false) {
          const queryRegex = query
            ? new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&'), 'i')
            : undefined;
          search.updateSearchQuery(searchPluginKey, queryRegex)(
            editor.view.state,
            editor.view.dispatch,
          );
        }
      });
    }
  }, [forEachEditor, query, results]);

  useEffect(() => {
    return () => {
      forEachEditor((editor) => {
        if (editor?.destroyed === false) {
          search.updateSearchQuery(searchPluginKey, undefined)(
            editor.view.state,
            editor.view.dispatch,
          );
        }
      });
    };
  }, [forEachEditor]);

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
