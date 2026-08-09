import type {
  SavedMarkdownSearchResult,
  WorkspaceSearchService,
} from '@bangle.io/service-core';
import {
  CommandGroup,
  CommandItem,
  CommandMenuRow,
} from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { FileText } from 'lucide-react';
import React from 'react';

const SEARCH_DEBOUNCE_MS = 180;
const SEARCH_RESULT_LIMIT = 100;

type WorkspaceSearchContract = Pick<
  WorkspaceSearchService,
  'searchSavedMarkdown'
>;

export type SavedMarkdownSearchState =
  | { requestKey: string; status: 'idle' }
  | { requestKey: string; status: 'loading' }
  | {
      requestKey: string;
      result: SavedMarkdownSearchResult;
      status: 'ready';
    }
  | { requestKey: string; status: 'error' };

function requestKey(wsName: string | undefined, query: string): string {
  return JSON.stringify([wsName, query]);
}

/**
 * Owns the debounced Omni request lifecycle. The returned state is always
 * keyed to the current workspace and query, so an old result is hidden even
 * during the render before its effect cleanup runs.
 */
export function useSavedMarkdownSearch({
  debounceMs = SEARCH_DEBOUNCE_MS,
  open,
  query,
  service,
  wsName,
}: {
  debounceMs?: number;
  open: boolean;
  query: string;
  service: WorkspaceSearchContract;
  wsName: string | undefined;
}): SavedMarkdownSearchState {
  const normalizedQuery = query.trim();
  const currentRequestKey = requestKey(wsName, normalizedQuery);
  const generationRef = React.useRef(0);
  const [state, setState] = React.useState<SavedMarkdownSearchState>({
    requestKey: currentRequestKey,
    status: 'idle',
  });

  React.useEffect(() => {
    generationRef.current += 1;
    const generation = generationRef.current;
    const controller = new AbortController();

    if (!open || !wsName || normalizedQuery.length === 0) {
      setState({ requestKey: currentRequestKey, status: 'idle' });
      return () => controller.abort();
    }

    setState({ requestKey: currentRequestKey, status: 'loading' });
    const timeout = window.setTimeout(() => {
      void service
        .searchSavedMarkdown({
          limit: SEARCH_RESULT_LIMIT,
          query: normalizedQuery,
          signal: controller.signal,
          wsName,
        })
        .then((result) => {
          if (
            !controller.signal.aborted &&
            generation === generationRef.current
          ) {
            setState({
              requestKey: currentRequestKey,
              result,
              status: 'ready',
            });
          }
        })
        .catch(() => {
          if (
            !controller.signal.aborted &&
            generation === generationRef.current
          ) {
            setState({ requestKey: currentRequestKey, status: 'error' });
          }
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [currentRequestKey, debounceMs, normalizedQuery, open, service, wsName]);

  if (!open || !wsName || normalizedQuery.length === 0) {
    return { requestKey: currentRequestKey, status: 'idle' };
  }
  if (state.requestKey !== currentRequestKey) {
    return { requestKey: currentRequestKey, status: 'loading' };
  }
  return state;
}

function SearchStatus({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-6 text-center text-muted-foreground text-sm"
      role="status"
    >
      {children}
    </div>
  );
}

export function SavedMarkdownSearchRoute({
  onSelect,
  query,
  state,
  wsName,
}: {
  onSelect: (wsPath: string) => void;
  query: string;
  state: SavedMarkdownSearchState;
  wsName: string | undefined;
}) {
  const normalizedQuery = query.trim();

  if (!wsName) {
    return (
      <SearchStatus>{t.app.omniSearch.savedContentNoWorkspace}</SearchStatus>
    );
  }
  if (normalizedQuery.length === 0 || state.status === 'idle') {
    return <SearchStatus>{t.app.omniSearch.savedContentPrompt}</SearchStatus>;
  }
  if (state.status === 'loading') {
    return <SearchStatus>{t.app.omniSearch.savedContentLoading}</SearchStatus>;
  }
  if (state.status === 'error') {
    return <SearchStatus>{t.app.omniSearch.savedContentError}</SearchStatus>;
  }

  const { groups, skipped, truncated } = state.result;
  const skippedCount =
    skipped.oversizedWsPaths.length + skipped.unreadableWsPaths.length;

  return (
    <>
      <div className="px-4 pt-3 text-muted-foreground text-xs">
        {t.app.omniSearch.savedContentHeading}
      </div>
      {skippedCount > 0 && (
        <div
          className="mx-3 mt-2 rounded-md border border-border px-3 py-2 text-muted-foreground text-xs"
          role="status"
        >
          {t.app.omniSearch.savedContentPartial({
            oversizedCount: skipped.oversizedWsPaths.length,
            unreadableCount: skipped.unreadableWsPaths.length,
          })}
        </div>
      )}
      {truncated && (
        <div className="px-4 pt-2 text-muted-foreground text-xs" role="status">
          {t.app.omniSearch.savedContentTruncated}
        </div>
      )}
      {groups.length === 0 ? (
        <SearchStatus>{t.app.omniSearch.savedContentNoResults}</SearchStatus>
      ) : (
        groups.map((group) => (
          <CommandGroup
            heading={WsPath.assertFile(group.wsPath).filePath}
            key={group.wsPath}
          >
            {group.matches.map((match) => (
              <CommandItem
                id={`saved-content-${group.wsPath}-${match.lineNumber}`}
                key={`${group.wsPath}:${match.lineNumber}`}
                onSelect={() => onSelect(group.wsPath)}
                title={match.snippet}
              >
                <CommandMenuRow
                  description={
                    <code className="whitespace-pre">{match.snippet}</code>
                  }
                  icon={<FileText aria-hidden />}
                  title={t.app.omniSearch.savedContentLine({
                    lineNumber: match.lineNumber,
                  })}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        ))
      )}
    </>
  );
}
