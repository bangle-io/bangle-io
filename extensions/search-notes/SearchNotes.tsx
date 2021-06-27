import { SearchInput } from './SearchInput';
import React, {
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { SearchResults } from './SearchResults';
import { Sidebar, ButtonIcon } from 'ui-components/index';
import { useWorkspaceContext } from 'workspace-context/index';
import { searchNotes } from './search-notes';
import { rIdleDebounce } from 'utils/index';
import { ActionContext } from 'action-context';
import { SearchResultItem } from './types';

export function SearchNotes() {
  const { dispatchAction } = useContext(ActionContext);

  const { wsName, noteWsPaths = [], getNote } = useWorkspaceContext();
  const [results, updateResults] = useState<SearchResultItem[] | null>(null);
  const [query, updateQuery] = useState('');
  const [collapseAllCounter, updateCollapseAllCounter] = useState(0);

  const counterRef = useRef(0);
  const controllerRef = useRef<AbortController>();
  const theFunc = useCallback(() => {
    counterRef.current++;
    const startCounter = counterRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    updateResults(null);
    searchNotes(query, noteWsPaths, getNote, controller.signal)
      .then((result) => {
        if (startCounter === counterRef.current && !controller.signal.aborted) {
          updateResults(result);
        }
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        throw error;
      });
  }, [query, noteWsPaths, getNote]);

  const findTextRef = useRef(theFunc);

  findTextRef.current = theFunc;

  const debouncedFunc = useMemo(() => {
    return rIdleDebounce(() => findTextRef.current());
  }, [findTextRef]);

  useEffect(() => {
    controllerRef.current?.abort();
    if (query.length > 0) {
      debouncedFunc();
    }
    updateCollapseAllCounter(0);
  }, [query, wsName, debouncedFunc]);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

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
        <span className="">{results && `Found ${results.length} notes`}</span>
        {results && (
          <ButtonIcon
            hint="Collapses all search results"
            className="cursor-pointer px-1 b-text-color-lighter rounded-sm hover:b-accent-2-color"
            onClick={() => {
              updateCollapseAllCounter((c) => c + 1);
            }}
          >
            Collapse all
          </ButtonIcon>
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
