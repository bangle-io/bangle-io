import { normalizeTextSearchQuery } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { Button, Input } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { FileText, LoaderCircle, Search } from 'lucide-react';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { WorkspaceNotFoundView } from '../components/feedback/workspace-not-found-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';
import {
  MAX_TEXT_SEARCH_QUERY_LENGTH,
  MAX_TEXT_SEARCH_RESULTS,
  MIN_TEXT_SEARCH_QUERY_LENGTH,
  searchWorkspaceText,
  type TextSearchMatch,
} from '../search/workspace-text-search';

type TextSearchState = {
  status: 'idle' | 'searching' | 'complete' | 'error';
  matches: TextSearchMatch[];
  failedFileCount: number;
  searchedFileCount: number;
  truncated: boolean;
};

const EMPTY_SEARCH_STATE: TextSearchState = {
  status: 'idle',
  matches: [],
  failedFileCount: 0,
  searchedFileCount: 0,
  truncated: false,
};

function useTextSearch({
  active,
  request,
  wsPaths,
  preferredWsPath,
  recentWsPaths,
  readText,
}: {
  active: boolean;
  request: { query: string; retryVersion: number };
  wsPaths: string[];
  preferredWsPath?: string;
  recentWsPaths: string[];
  readText: (
    wsPath: string,
    signal: AbortSignal,
  ) => Promise<string | undefined>;
}): TextSearchState {
  const [state, setState] = React.useState(EMPTY_SEARCH_STATE);
  const searchRunId = React.useRef(0);

  React.useEffect(() => {
    const { query } = request;
    const runId = ++searchRunId.current;
    if (!active || query.length < MIN_TEXT_SEARCH_QUERY_LENGTH) {
      setState(EMPTY_SEARCH_STATE);
      return;
    }

    const abortController = new AbortController();
    const isCurrentRun = () =>
      searchRunId.current === runId && !abortController.signal.aborted;
    setState({ ...EMPTY_SEARCH_STATE, status: 'searching' });

    void searchWorkspaceText({
      wsPaths,
      preferredWsPath,
      recentWsPaths,
      query,
      signal: abortController.signal,
      readText,
      onMatch: (match) => {
        if (!isCurrentRun()) {
          return;
        }
        setState((current) => ({
          ...current,
          matches: [...current.matches, match],
        }));
      },
    })
      .then((result) => {
        if (!isCurrentRun()) {
          return;
        }
        setState({ status: 'complete', ...result });
      })
      .catch(() => {
        if (isCurrentRun()) {
          setState({ ...EMPTY_SEARCH_STATE, status: 'error' });
        }
      });

    return () => abortController.abort();
  }, [active, preferredWsPath, readText, recentWsPaths, request, wsPaths]);

  return state;
}

type ResultGroup = {
  wsPath: string;
  fileName: string;
  matches: TextSearchMatch[];
};

function groupMatches(matches: TextSearchMatch[]): ResultGroup[] {
  const groups = new Map<string, ResultGroup>();
  for (const match of matches) {
    const current = groups.get(match.wsPath);
    if (current) {
      current.matches.push(match);
      continue;
    }
    const filePath = WsPath.safeParseFile(match.wsPath).data;
    groups.set(match.wsPath, {
      wsPath: match.wsPath,
      fileName: filePath?.fileName ?? match.wsPath,
      matches: [match],
    });
  }
  return [...groups.values()];
}

function useRecentWsPaths(
  wsName: string,
  loadRecentWsPaths: (wsName: string) => Promise<string[]>,
): string[] | undefined {
  const [recentWsPaths, setRecentWsPaths] = React.useState<
    string[] | undefined
  >();

  React.useEffect(() => {
    if (!wsName) {
      setRecentWsPaths([]);
      return;
    }

    let active = true;
    setRecentWsPaths(undefined);
    void loadRecentWsPaths(wsName).then(
      (paths) => {
        if (active) {
          setRecentWsPaths(paths);
        }
      },
      () => {
        if (active) {
          setRecentWsPaths([]);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [loadRecentWsPaths, wsName]);

  return recentWsPaths;
}

export function PageTextSearch() {
  const { fileSystem, navigation, userActivityService, workspaceState } =
    useCoreServices();
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const currentWsName = useAtomValue(workspaceState.$currentWsName);
  const fileTreeListState = useAtomValue(workspaceState.$fileTreeListState);
  const listedFileTreeWsName = useAtomValue(
    workspaceState.$listedFileTreeWsName,
  );
  const noteWsPaths = useAtomValue(workspaceState.$noteWsPaths);
  const route =
    routeInfo.route === 'text-search' ? routeInfo.payload : undefined;
  const wsName = route?.wsName ?? '';
  const submittedQuery = normalizeTextSearchQuery(route?.query) ?? '';
  const [draftQuery, setDraftQuery] = React.useState(submittedQuery);
  const [retryVersion, setRetryVersion] = React.useState(0);

  React.useEffect(() => {
    setDraftQuery(submittedQuery);
  }, [submittedQuery]);

  const wsPathStrings = React.useMemo(
    () =>
      noteWsPaths
        .filter((wsPath) => wsPath.wsName === wsName)
        .map((wsPath) => wsPath.wsPath),
    [noteWsPaths, wsName],
  );
  const listingReady =
    listedFileTreeWsName === wsName && fileTreeListState.status === 'ok';
  const fileTreeError =
    currentWsName === wsName && fileTreeListState.status === 'error';
  const loadRecentWsPaths = React.useCallback(
    async (workspaceName: string) => {
      const activities = await userActivityService.getRecent(
        workspaceName,
        'ws-path',
      );
      return activities.map((activity) => activity.data.wsPath);
    },
    [userActivityService],
  );
  const recentWsPaths = useRecentWsPaths(wsName, loadRecentWsPaths);
  const readText = React.useCallback(
    (wsPath: string, signal: AbortSignal) =>
      fileSystem.readFileAsText(wsPath, { signal }),
    [fileSystem],
  );
  const searchRequest = React.useMemo(
    () => ({ query: submittedQuery, retryVersion }),
    [retryVersion, submittedQuery],
  );
  const searchState = useTextSearch({
    active: Boolean(
      route && currentWsName === wsName && listingReady && recentWsPaths,
    ),
    request: searchRequest,
    wsPaths: wsPathStrings,
    preferredWsPath: route?.preferredWsPath,
    recentWsPaths: recentWsPaths ?? [],
    readText,
  });
  const visibleSearchState =
    submittedQuery.length >= MIN_TEXT_SEARCH_QUERY_LENGTH &&
    (!listingReady || recentWsPaths === undefined) &&
    !fileTreeError
      ? { ...EMPTY_SEARCH_STATE, status: 'searching' as const }
      : fileTreeError
        ? EMPTY_SEARCH_STATE
        : searchState;
  const resultGroups = React.useMemo(
    () => groupMatches(visibleSearchState.matches),
    [visibleSearchState.matches],
  );

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = normalizeTextSearchQuery(draftQuery) ?? '';
    if (query.length < MIN_TEXT_SEARCH_QUERY_LENGTH || !route) {
      return;
    }
    if (query === submittedQuery) {
      setRetryVersion((current) => current + 1);
      return;
    }
    navigation.goTextSearch(
      {
        wsName: route.wsName,
        query,
        preferredWsPath: route.preferredWsPath,
      },
      { replace: true },
    );
  };

  return (
    <>
      <AppHeader />
      <PageContentContainer
        respectEditorWidthPreference={false}
        testId="page-text-search"
      >
        {currentWsName && route ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-4 sm:py-8">
            <header className="space-y-1">
              <h1 className="font-semibold text-2xl tracking-tight">
                {t.app.pageTextSearch.title}
              </h1>
              <p className="text-muted-foreground text-sm">
                {t.app.pageTextSearch.description({ wsName })}
              </p>
            </header>

            <form className="flex items-end gap-2" onSubmit={submitSearch}>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <label
                  className="font-medium text-sm"
                  htmlFor="note-text-search"
                >
                  {t.app.pageTextSearch.inputLabel}
                </label>
                <Input
                  autoFocus
                  data-testid="text-search-input"
                  id="note-text-search"
                  maxLength={MAX_TEXT_SEARCH_QUERY_LENGTH}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder={t.app.pageTextSearch.inputPlaceholder}
                  type="search"
                  value={draftQuery}
                />
              </div>
              <Button
                disabled={
                  draftQuery.trim().length < MIN_TEXT_SEARCH_QUERY_LENGTH
                }
                type="submit"
              >
                <Search aria-hidden className="size-4" />
                {t.app.pageTextSearch.searchButton}
              </Button>
            </form>

            <SearchStatus
              fileTreeError={fileTreeError}
              noteCount={wsPathStrings.length}
              query={submittedQuery}
              retryFileTree={() => fileSystem.refreshFileTree()}
              retry={() => setRetryVersion((current) => current + 1)}
              state={visibleSearchState}
            />

            {resultGroups.length > 0 ? (
              <div className="space-y-4" data-testid="text-search-results">
                <p
                  className="text-muted-foreground text-sm"
                  role={
                    visibleSearchState.status === 'complete'
                      ? 'status'
                      : undefined
                  }
                >
                  {t.app.pageTextSearch.resultSummary({
                    matches: visibleSearchState.matches.length,
                    notes: resultGroups.length,
                    query: submittedQuery,
                  })}
                </p>
                {resultGroups.map((group, groupIndex) => (
                  <section
                    aria-labelledby={`text-search-result-${groupIndex}`}
                    className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm"
                    key={group.wsPath}
                  >
                    <header className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
                      <div className="min-w-0">
                        <h2
                          className="flex items-center gap-2 font-medium"
                          id={`text-search-result-${groupIndex}`}
                        >
                          <FileText aria-hidden className="size-4 shrink-0" />
                          <span className="truncate">{group.fileName}</span>
                        </h2>
                        <p className="truncate text-muted-foreground text-xs">
                          {group.wsPath}
                        </p>
                      </div>
                      <span className="shrink-0 text-muted-foreground text-xs">
                        {t.app.pageTextSearch.noteMatchCount({
                          count: group.matches.length,
                        })}
                      </span>
                    </header>
                    <ol className="divide-y">
                      {group.matches.map((match) => (
                        <li key={`${match.wsPath}:${match.index}`}>
                          <a
                            className="block px-4 py-3 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
                            href={navigation.toWsFileUri(match.wsPath)}
                          >
                            <span className="sr-only">
                              {t.app.pageTextSearch.openNote({
                                fileName: group.fileName,
                              })}{' '}
                            </span>
                            <span className="mb-1 block text-muted-foreground text-xs">
                              {t.app.pageTextSearch.lineLabel({
                                line: match.lineNumber,
                              })}
                            </span>
                            <span className="wrap-anywhere block text-sm leading-6">
                              {match.snippet.before}
                              <mark className="rounded-sm bg-pop px-0.5 text-pop-foreground">
                                {match.snippet.match}
                              </mark>
                              {match.snippet.after}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <ContentSection hasPadding>
            <WorkspaceNotFoundView wsName={wsName || undefined} />
          </ContentSection>
        )}
      </PageContentContainer>
    </>
  );
}

function SearchStatus({
  fileTreeError,
  noteCount,
  query,
  retry,
  retryFileTree,
  state,
}: {
  fileTreeError: boolean;
  noteCount: number;
  query: string;
  retry: () => void;
  retryFileTree: () => void;
  state: TextSearchState;
}) {
  if (!query) {
    return (
      <p className="text-muted-foreground text-sm">
        {t.app.pageTextSearch.intro}
      </p>
    );
  }
  if (query.length < MIN_TEXT_SEARCH_QUERY_LENGTH) {
    return (
      <p className="text-muted-foreground text-sm">
        {t.app.pageTextSearch.minimumQuery({
          count: MIN_TEXT_SEARCH_QUERY_LENGTH,
        })}
      </p>
    );
  }
  if (fileTreeError) {
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        role="alert"
      >
        <p>{t.app.pageTextSearch.fileTreeError}</p>
        <Button onClick={retryFileTree} size="sm" variant="outline">
          {t.app.pageTextSearch.retryButton}
        </Button>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        role="alert"
      >
        <p>{t.app.pageTextSearch.unexpectedError}</p>
        <Button onClick={retry} size="sm" variant="outline">
          {t.app.pageTextSearch.retryButton}
        </Button>
      </div>
    );
  }

  const allFilesFailed =
    state.status === 'complete' &&
    state.failedFileCount > 0 &&
    state.searchedFileCount === 0;

  return (
    <div aria-live="polite" className="space-y-2">
      {state.status === 'searching' ? (
        <p
          className="flex items-center gap-2 text-muted-foreground text-sm"
          role="status"
        >
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {t.app.pageTextSearch.searching}
        </p>
      ) : null}
      {allFilesFailed ? (
        <p
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          role="alert"
        >
          {t.app.pageTextSearch.allFilesFailed}
        </p>
      ) : null}
      {!allFilesFailed && state.failedFileCount > 0 ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          {t.app.pageTextSearch.partialResults({
            count: state.failedFileCount,
          })}
        </p>
      ) : null}
      {state.truncated ? (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          {t.app.pageTextSearch.truncated({
            count: MAX_TEXT_SEARCH_RESULTS,
          })}
        </p>
      ) : null}
      {state.status === 'complete' &&
      state.matches.length === 0 &&
      !allFilesFailed ? (
        <p className="rounded-lg border bg-muted/30 px-4 py-8 text-center text-muted-foreground text-sm">
          {noteCount === 0
            ? t.app.pageTextSearch.noNotes
            : t.app.pageTextSearch.noMatches({ query })}
        </p>
      ) : null}
    </div>
  );
}
