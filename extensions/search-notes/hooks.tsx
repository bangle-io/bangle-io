import { useCallback, useEffect, useRef, useState } from 'react';

import { search } from '@bangle.dev/search';

import { useBangleStoreContext } from '@bangle.io/app-state-context';
import { forEachEditor } from '@bangle.io/editor-manager-context';
import { useExtensionState } from '@bangle.io/extension-registry';
import { useDebouncedValue } from '@bangle.io/utils';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import {
  DEBOUNCE_MAX_WAIT,
  DEBOUNCE_WAIT,
  extensionName,
  SearchNotesExtensionState,
  searchPluginKey,
} from './constants';
import { searchNotes } from './search-notes';

/**
 * Helpers hook for using the extension state.
 */
export function useSearchNotesState() {
  return useExtensionState<SearchNotesExtensionState>(extensionName);
}

/**
 * Performs search across the workspace and updates the extension state
 * accordingly
 */
export function useSearchNotes() {
  const { wsName } = useWorkspaceContext();
  const counterRef = useRef(0);
  const controllerRef = useRef<AbortController>();
  const destroyedRef = useRef<boolean>(false);
  const [{ searchQuery }, updateState] = useSearchNotesState();
  const debouncedSearchQuery = useDebouncedValue(searchQuery, {
    wait: DEBOUNCE_WAIT,
    maxWait: DEBOUNCE_MAX_WAIT,
  });
  const [lastSearchedFor, updateLastSearchedFor] = useState<string | null>(
    null,
  );

  const updatePendingSearch = useCallback(
    (pendingSearch) => {
      updateState((state) => ({
        ...state,
        pendingSearch,
      }));
    },
    [updateState],
  );

  const updateResults = useCallback(
    (results) => {
      updateState((state) => ({
        ...state,
        searchResults: results,
      }));
    },
    [updateState],
  );

  useEffect(() => {
    controllerRef.current?.abort();
  }, [searchQuery, wsName]);

  useEffect(() => {
    if (destroyedRef.current) {
      return;
    }
    if (lastSearchedFor === debouncedSearchQuery) {
      return;
    }
    if (debouncedSearchQuery.length === 0) {
      return;
    }
    if (!wsName) {
      return;
    }
    counterRef.current++;
    const startCounter = counterRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    updateResults(null);
    updatePendingSearch(true);
    updateLastSearchedFor(debouncedSearchQuery);
    searchNotes(controller.signal, debouncedSearchQuery, wsName)
      .then((result) => {
        if (startCounter === counterRef.current) {
          updatePendingSearch(false);
          if (!controller.signal.aborted) {
            updateResults(result);
          }
        }
      })
      .catch((error) => {
        if (startCounter === counterRef.current) {
          updatePendingSearch(false);
        }
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      });
  }, [
    wsName,
    lastSearchedFor,
    debouncedSearchQuery,
    updateResults,
    updatePendingSearch,
  ]);

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
      controllerRef.current?.abort();
    };
  }, []);
}

/**
 * Highlights open editors based on the current search query
 */
export function useHighlightEditors() {
  const [{ searchResults, searchQuery }] = useSearchNotesState();
  const hasResults = searchResults ? searchResults.length > 0 : false;
  const store = useBangleStoreContext();

  useEffect(() => {
    if (hasResults && searchQuery) {
      forEachEditor((editor) => {
        if (editor?.destroyed === false) {
          const queryRegex = searchQuery
            ? new RegExp(
                searchQuery.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&'),
                'i',
              )
            : undefined;
          search.updateSearchQuery(searchPluginKey, queryRegex)(
            editor.view.state,
            editor.view.dispatch,
          );
        }
      })(store.state);
    }
  }, [store, searchQuery, hasResults]);

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
}
