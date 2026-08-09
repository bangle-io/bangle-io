import {
  BaseService,
  type BaseServiceContext,
  isAbortError,
} from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';
import type { FileSystemService } from './file-system-service';

const WORKSPACE_SEARCH_MAX_MATCHING_LINES = 100;
const WORKSPACE_SEARCH_WORKER_COUNT = 4;
export const WORKSPACE_SEARCH_SNIPPET_MAX_LENGTH = 240;

export type SavedMarkdownLineMatch = {
  /** One-based source line number. */
  lineNumber: number;
  /** A bounded excerpt copied directly from the saved Markdown source line. */
  snippet: string;
};

type SavedMarkdownNoteMatches = {
  matches: SavedMarkdownLineMatch[];
  wsPath: string;
};

export type SavedMarkdownSearchResult = {
  groups: SavedMarkdownNoteMatches[];
  skipped: {
    oversizedWsPaths: string[];
    unreadableWsPaths: string[];
  };
  /** True when more matching source lines exist than the returned limit. */
  truncated: boolean;
};

export type SearchSavedMarkdownInput = {
  limit: number;
  query: string;
  signal: AbortSignal;
  wsName: string;
};

type WorkspaceSearchFileSystem = Pick<
  FileSystemService,
  'getMaxFileSizeBytes' | 'listNoteFiles' | 'mount' | 'readFile'
>;

type NoteSearchOutcome =
  | { kind: 'matches'; matches: SavedMarkdownLineMatch[]; wsPath: string }
  | { kind: 'oversized'; wsPath: string }
  | { kind: 'unreadable'; wsPath: string };

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw (
      signal.reason ??
      new DOMException('The operation was aborted', 'AbortError')
    );
  }
}

function compareWsPaths(first: string, second: string): number {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

/**
 * Builds a bounded excerpt without parsing or normalizing the Markdown line.
 * The matching text remains visible even when it occurs near the end of a
 * very long source line.
 */
export function createSavedMarkdownSnippet(
  line: string,
  matchIndex: number,
  queryLength: number,
): string {
  if (line.length <= WORKSPACE_SEARCH_SNIPPET_MAX_LENGTH) {
    return line;
  }

  const ellipsis = '…';
  const availableLength = WORKSPACE_SEARCH_SNIPPET_MAX_LENGTH - 2;
  const desiredStart = Math.max(
    0,
    matchIndex - Math.floor((availableLength - queryLength) / 2),
  );
  const maxStart = Math.max(0, line.length - availableLength);
  const start = Math.min(desiredStart, maxStart);
  const end = Math.min(line.length, start + availableLength);

  return `${start > 0 ? ellipsis : ''}${line.slice(start, end)}${
    end < line.length ? ellipsis : ''
  }`;
}

/** Finds literal, case-insensitive matches, with at most one result per line. */
export function findSavedMarkdownLineMatches(
  markdown: string,
  query: string,
  maxMatches = WORKSPACE_SEARCH_MAX_MATCHING_LINES + 1,
): SavedMarkdownLineMatch[] {
  if (query.length === 0 || maxMatches <= 0) {
    return [];
  }

  const normalizedQuery = query.toLowerCase();
  const matches: SavedMarkdownLineMatch[] = [];
  const lines = markdown.split(/\r\n|\n|\r/);

  for (const [index, line] of lines.entries()) {
    const matchIndex = line.toLowerCase().indexOf(normalizedQuery);
    if (matchIndex === -1) {
      continue;
    }

    matches.push({
      lineNumber: index + 1,
      snippet: createSavedMarkdownSnippet(line, matchIndex, query.length),
    });
    if (matches.length >= maxMatches) {
      break;
    }
  }

  return matches;
}

/**
 * Searches the saved Markdown files in one workspace. This service owns the
 * storage traversal and bounded concurrency so consumers only coordinate a
 * query lifecycle and render the stable grouped result.
 */
export class WorkspaceSearchService extends BaseService {
  static deps = ['fileSystem'] as const;

  constructor(
    context: BaseServiceContext,
    private dependencies: { fileSystem: WorkspaceSearchFileSystem },
  ) {
    super(SERVICE_NAME.workspaceSearchService, context, dependencies);
  }

  async hookMount(): Promise<void> {}

  public async searchSavedMarkdown({
    wsName,
    query,
    signal,
    limit,
  }: SearchSavedMarkdownInput): Promise<SavedMarkdownSearchResult> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError(
        'Saved Markdown search limit must be a positive integer',
      );
    }
    throwIfAborted(signal);

    const resultLimit = Math.min(limit, WORKSPACE_SEARCH_MAX_MATCHING_LINES);
    if (query.length === 0) {
      return {
        groups: [],
        skipped: { oversizedWsPaths: [], unreadableWsPaths: [] },
        truncated: false,
      };
    }

    // A listing failure invalidates the entire search; unlike individual read
    // failures, there is no trustworthy workspace scope to report as partial.
    const wsPaths = [
      ...(await this.dependencies.fileSystem.listNoteFiles(wsName, signal)),
    ].sort(compareWsPaths);
    throwIfAborted(signal);

    let nextIndex = 0;
    const outcomes: NoteSearchOutcome[] = [];
    const searchOne = async (wsPath: string): Promise<NoteSearchOutcome> => {
      try {
        throwIfAborted(signal);
        const [file, maxFileSizeBytes] = await Promise.all([
          this.dependencies.fileSystem.readFile(wsPath, { signal }),
          this.dependencies.fileSystem.getMaxFileSizeBytes(wsPath),
        ]);
        throwIfAborted(signal);

        if (!file) {
          return { kind: 'unreadable', wsPath };
        }
        if (!Number.isFinite(file.size) || file.size > maxFileSizeBytes) {
          return { kind: 'oversized', wsPath };
        }

        const markdown = await file.text();
        throwIfAborted(signal);
        return {
          kind: 'matches',
          matches: findSavedMarkdownLineMatches(
            markdown,
            query,
            resultLimit + 1,
          ),
          wsPath,
        };
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          throw error;
        }
        return { kind: 'unreadable', wsPath };
      }
    };

    const worker = async (): Promise<void> => {
      while (true) {
        throwIfAborted(signal);
        const index = nextIndex;
        nextIndex += 1;
        const wsPath = wsPaths[index];
        if (wsPath === undefined) {
          return;
        }
        outcomes[index] = await searchOne(wsPath);
      }
    };

    const workerCount = Math.min(WORKSPACE_SEARCH_WORKER_COUNT, wsPaths.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    throwIfAborted(signal);

    const groups: SavedMarkdownNoteMatches[] = [];
    const oversizedWsPaths: string[] = [];
    const unreadableWsPaths: string[] = [];
    let remaining = resultLimit;
    let truncated = false;

    for (const outcome of outcomes) {
      if (outcome.kind === 'oversized') {
        oversizedWsPaths.push(outcome.wsPath);
        continue;
      }
      if (outcome.kind === 'unreadable') {
        unreadableWsPaths.push(outcome.wsPath);
        continue;
      }
      if (outcome.matches.length === 0) {
        continue;
      }

      const acceptedMatches = outcome.matches.slice(0, remaining);
      if (acceptedMatches.length > 0) {
        groups.push({ matches: acceptedMatches, wsPath: outcome.wsPath });
        remaining -= acceptedMatches.length;
      }
      if (acceptedMatches.length < outcome.matches.length) {
        truncated = true;
      }
    }

    return {
      groups,
      skipped: { oversizedWsPaths, unreadableWsPaths },
      truncated,
    };
  }
}
