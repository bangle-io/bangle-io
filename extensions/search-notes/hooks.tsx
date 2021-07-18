import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounceFn } from 'utils';
import { useWorkspaceContext } from 'workspace-context';
import { DEBOUNCE_MAX_WAIT, DEBOUNCE_WAIT } from './debounce-config';
import { searchNotes } from './search-notes';
import { SearchResultItem } from './types';

export function useSearchNotes(query: string): {
  results: SearchResultItem[] | null;
  pendingSearch: boolean;
} {
  const { wsName, noteWsPaths = [], getNote } = useWorkspaceContext();
  const [results, updateResults] = useState<SearchResultItem[] | null>(null);
  const counterRef = useRef(0);
  const controllerRef = useRef<AbortController>();
  const destroyedRef = useRef<boolean>(false);
  const [pendingSearch, updatePendingSearch] = useState(false);
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
  }, [query, noteWsPaths, getNote]);

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

  return { results, pendingSearch };
}
