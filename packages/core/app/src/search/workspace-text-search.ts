import {
  normalizeTextSearchQuery,
  TEXT_SEARCH_QUERY_MAX_LENGTH,
  TEXT_SEARCH_QUERY_MIN_LENGTH,
} from '@bangle.io/constants';

export const MIN_TEXT_SEARCH_QUERY_LENGTH = TEXT_SEARCH_QUERY_MIN_LENGTH;
export const MAX_TEXT_SEARCH_QUERY_LENGTH = TEXT_SEARCH_QUERY_MAX_LENGTH;
export const MAX_TEXT_SEARCH_RESULTS = 200;

const SNIPPET_CONTEXT_LENGTH = 60;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type TextSearchMatch = {
  wsPath: string;
  index: number;
  lineNumber: number;
  snippet: {
    before: string;
    match: string;
    after: string;
  };
};

export type WorkspaceTextSearchResult = {
  matches: TextSearchMatch[];
  failedFileCount: number;
  searchedFileCount: number;
  truncated: boolean;
};

export function orderWsPathsForTextSearch({
  wsPaths,
  preferredWsPath,
  recentWsPaths,
}: {
  wsPaths: string[];
  preferredWsPath?: string;
  recentWsPaths: string[];
}): string[] {
  const available = new Set(wsPaths);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const wsPath of [preferredWsPath, ...recentWsPaths]) {
    if (!wsPath || !available.has(wsPath) || seen.has(wsPath)) {
      continue;
    }
    seen.add(wsPath);
    ordered.push(wsPath);
  }

  return [
    ...ordered,
    ...wsPaths
      .filter((wsPath) => !seen.has(wsPath))
      .sort((a, b) => a.localeCompare(b)),
  ];
}

export function findTextMatches(
  content: string,
  query: string,
  limit = MAX_TEXT_SEARCH_RESULTS,
): { matches: Omit<TextSearchMatch, 'wsPath'>[]; truncated: boolean } {
  const normalizedQuery = normalizeTextSearchQuery(query) ?? '';
  if (normalizedQuery.length < MIN_TEXT_SEARCH_QUERY_LENGTH || limit <= 0) {
    return { matches: [], truncated: false };
  }

  const matcher = new RegExp(escapeRegExp(normalizedQuery), 'giu');
  const matches: Omit<TextSearchMatch, 'wsPath'>[] = [];

  for (const sourceMatch of content.matchAll(matcher)) {
    if (matches.length === limit) {
      return { matches, truncated: true };
    }

    const index = sourceMatch.index;
    const matchedText = sourceMatch[0];
    const matchEnd = index + matchedText.length;
    const contextStart = Math.max(0, index - SNIPPET_CONTEXT_LENGTH);
    const contextEnd = Math.min(
      content.length,
      matchEnd + SNIPPET_CONTEXT_LENGTH,
    );
    const compact = (value: string) => value.replace(/\s+/g, ' ');

    matches.push({
      index,
      lineNumber: (content.slice(0, index).match(/\n/g)?.length ?? 0) + 1,
      snippet: {
        before: `${contextStart > 0 ? '…' : ''}${compact(
          content.slice(contextStart, index),
        )}`,
        match: matchedText,
        after: `${compact(content.slice(matchEnd, contextEnd))}${
          contextEnd < content.length ? '…' : ''
        }`,
      },
    });
  }

  return { matches, truncated: false };
}

export async function searchWorkspaceText({
  wsPaths,
  preferredWsPath,
  recentWsPaths,
  query,
  signal,
  readText,
  onMatch,
}: {
  wsPaths: string[];
  preferredWsPath?: string;
  recentWsPaths: string[];
  query: string;
  signal: AbortSignal;
  readText: (
    wsPath: string,
    signal: AbortSignal,
  ) => Promise<string | undefined>;
  onMatch?: (match: TextSearchMatch) => void;
}): Promise<WorkspaceTextSearchResult> {
  const normalizedQuery = normalizeTextSearchQuery(query) ?? '';
  if (normalizedQuery.length < MIN_TEXT_SEARCH_QUERY_LENGTH) {
    return {
      matches: [],
      failedFileCount: 0,
      searchedFileCount: 0,
      truncated: false,
    };
  }

  const orderedWsPaths = orderWsPathsForTextSearch({
    wsPaths,
    preferredWsPath,
    recentWsPaths,
  });
  const matches: TextSearchMatch[] = [];
  let failedFileCount = 0;
  let searchedFileCount = 0;
  let truncated = false;

  for (const [wsPathIndex, wsPath] of orderedWsPaths.entries()) {
    signal.throwIfAborted();

    let content: string | undefined;
    try {
      content = await readText(wsPath, signal);
    } catch {
      if (signal.aborted) {
        signal.throwIfAborted();
      }
      failedFileCount += 1;
      continue;
    }

    signal.throwIfAborted();
    if (content === undefined) {
      continue;
    }
    searchedFileCount += 1;

    const remainingResultCount = MAX_TEXT_SEARCH_RESULTS - matches.length;
    const fileResult = findTextMatches(
      content,
      normalizedQuery,
      remainingResultCount,
    );
    truncated ||= fileResult.truncated;

    for (const fileMatch of fileResult.matches) {
      const match = { ...fileMatch, wsPath };
      matches.push(match);
      onMatch?.(match);
    }

    if (matches.length === MAX_TEXT_SEARCH_RESULTS) {
      truncated ||= wsPathIndex < orderedWsPaths.length - 1;
      break;
    }
  }

  return { matches, failedFileCount, searchedFileCount, truncated };
}
