import { useEditorManagerContext } from 'editor-manager-context';
import { useExtensionStateContext } from 'extension-registry';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { debounceFn } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { search } from '@bangle.dev/search';
import {
  searchPluginKey,
  DEBOUNCE_MAX_WAIT,
  DEBOUNCE_WAIT,
  extensionName,
  SearchNotesExtensionState,
} from './constants';
import { searchNotes } from './search-notes';

/**
 * Helpers hook for using the extension state.
 */
export function useSearchNotesState() {
  return useExtensionStateContext<SearchNotesExtensionState>(extensionName);
}

/**
 * Performs search across the workspace and updates the extension state
 * accordingly
 */
export function useSearchNotes(query: string) {
  const { wsName, noteWsPaths = [], getNote } = useWorkspaceContext();
  const counterRef = useRef(0);
  const controllerRef = useRef<AbortController>();
  const destroyedRef = useRef<boolean>(false);
  const [, updateState] = useSearchNotesState();

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

  const theFunc = useCallback(() => {
    if (destroyedRef.current) {
      return;
    }
    counterRef.current++;
    const startCounter = counterRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    updateResults(null);
    updatePendingSearch(true);
    searchNotes(query, noteWsPaths, getNote, controller.signal)
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
  }, [query, noteWsPaths, getNote, updateResults, updatePendingSearch]);

  const findTextRef = useRef(theFunc);
  findTextRef.current = theFunc;

  const debouncedFunc = useMemo(() => {
    return debounceFn(() => findTextRef.current(), {
      wait: DEBOUNCE_WAIT,
      maxWait: DEBOUNCE_MAX_WAIT,
    });
  }, [findTextRef]);

  useEffect(() => {
    controllerRef.current?.abort();
    if (query.length > 0) {
      debouncedFunc();
    }
  }, [query, wsName, debouncedFunc]);

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
  const { forEachEditor } = useEditorManagerContext();
  const [{ searchResults, searchQuery }] = useSearchNotesState();
  const hasResults = searchResults ? searchResults.length > 0 : false;

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
      });
    }
  }, [forEachEditor, searchQuery, hasResults]);

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
