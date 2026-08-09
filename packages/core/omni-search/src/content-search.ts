export const MIN_CONTENT_SEARCH_QUERY_LENGTH = 3;

const SNIPPET_CONTEXT_LENGTH = 60;

export type ContentSearchResult = {
  wsPath: string;
  snippet: {
    before: string;
    match: string;
    after: string;
  };
};

export type WorkspaceContentSearchResult = {
  matches: ContentSearchResult[];
  failedFileCount: number;
};

export function orderWsPathsForSearch({
  wsPaths,
  currentWsPath,
  recentWsPaths,
}: {
  wsPaths: string[];
  currentWsPath?: string;
  recentWsPaths: string[];
}): string[] {
  const available = new Set(wsPaths);
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const wsPath of [currentWsPath, ...recentWsPaths]) {
    if (!wsPath || !available.has(wsPath) || seen.has(wsPath)) {
      continue;
    }
    seen.add(wsPath);
    ordered.push(wsPath);
  }

  const remaining = wsPaths
    .filter((wsPath) => !seen.has(wsPath))
    .sort((a, b) => a.localeCompare(b));

  return [...ordered, ...remaining];
}

export function createContentMatchSnippet(
  content: string,
  query: string,
): ContentSearchResult['snippet'] | undefined {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < MIN_CONTENT_SEARCH_QUERY_LENGTH) {
    return undefined;
  }

  const matchIndex = content.toLowerCase().indexOf(normalizedQuery);
  if (matchIndex === -1) {
    return undefined;
  }

  const matchEnd = matchIndex + normalizedQuery.length;
  const contextStart = Math.max(0, matchIndex - SNIPPET_CONTEXT_LENGTH);
  const contextEnd = Math.min(
    content.length,
    matchEnd + SNIPPET_CONTEXT_LENGTH,
  );
  const compact = (value: string) => value.replace(/\s+/g, ' ');

  return {
    before: `${contextStart > 0 ? '…' : ''}${compact(
      content.slice(contextStart, matchIndex),
    )}`,
    match: content.slice(matchIndex, matchEnd),
    after: `${compact(content.slice(matchEnd, contextEnd))}${
      contextEnd < content.length ? '…' : ''
    }`,
  };
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason ?? new DOMException('Search aborted', 'AbortError');
  }
}

export async function searchWorkspaceContent({
  wsPaths,
  currentWsPath,
  recentWsPaths,
  query,
  signal,
  readText,
  onMatch,
}: {
  wsPaths: string[];
  currentWsPath?: string;
  recentWsPaths: string[];
  query: string;
  signal: AbortSignal;
  readText: (
    wsPath: string,
    signal: AbortSignal,
  ) => Promise<string | undefined>;
  onMatch?: (match: ContentSearchResult) => void;
}): Promise<WorkspaceContentSearchResult> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < MIN_CONTENT_SEARCH_QUERY_LENGTH) {
    return { matches: [], failedFileCount: 0 };
  }

  const matches: ContentSearchResult[] = [];
  let failedFileCount = 0;

  for (const wsPath of orderWsPathsForSearch({
    wsPaths,
    currentWsPath,
    recentWsPaths,
  })) {
    throwIfAborted(signal);

    let content: string | undefined;
    try {
      content = await readText(wsPath, signal);
    } catch (error) {
      if (signal.aborted) {
        throw signal.reason ?? error;
      }
      failedFileCount += 1;
      continue;
    }

    throwIfAborted(signal);
    if (content === undefined) {
      continue;
    }

    const snippet = createContentMatchSnippet(content, normalizedQuery);
    if (!snippet) {
      continue;
    }

    const match = { wsPath, snippet };
    matches.push(match);
    onMatch?.(match);
  }

  return { matches, failedFileCount };
}
