import { useActionContext } from 'action-context';
import React, { useContext, useEffect, useState } from 'react';
import { ButtonIcon, Sidebar, SpinnerIcon } from 'ui-components';
import { useWorkspaceContext } from 'workspace-context';
import { useSearchNotes } from './hooks';
import { SearchInput } from './SearchInput';
import { SearchResults } from './SearchResults';
import { search } from '@bangle.dev/search';
import { useEditorManagerContext } from 'editor-manager-context';
import { searchPluginKey } from './plugin-key';

export function SearchNotesSidebar() {
  const { dispatchAction } = useActionContext();
  const { forEachEditor } = useEditorManagerContext();
  const [query, updateQuery] = useState('');
  const { wsName } = useWorkspaceContext();
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);
  const { results, pendingSearch } = useSearchNotes(query);
  useEffect(() => {
    updateCollapseAllCounter(0);
  }, [query, wsName]);

  useEffect(() => {
    if (results && results.length > 0 && query) {
      forEachEditor((editor) => {
        if (editor?.destroyed === false) {
          const queryRegex = query
            ? new RegExp(query.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&'))
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
