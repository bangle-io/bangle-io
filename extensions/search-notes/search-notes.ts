import { useWorkspaceContext } from 'workspace-context';
import { SearchResultItem } from './types';
import { pMap } from './p-map';
export const CONCURRENCY = 10;

const maxChars = 75;

export async function searchNotes(
  query: string,
  noteWsPaths: string[],
  getNote: ReturnType<typeof useWorkspaceContext>['getNote'],
  signal: AbortSignal,
  {
    caseSensitive = false,
    offset = maxChars,
    intraFileLimit = 200,
    interFileLimit = 2000,
  } = {},
): Promise<SearchResultItem[]> {
  if (query === '') {
    return [];
  }

  query = query.slice(0, 200);

  query = caseSensitive ? query : query.toLocaleLowerCase();
  const docs = await pMap(
    noteWsPaths,
    (wsPath) => {
      return getNote(wsPath).then((doc) => {
        if (signal.aborted) {
          console.log('aborted');
          return null;
        }

        const results: SearchResultItem = {
          wsPath,
          matches: [],
        };
        doc.descendants((node, pos, parent) => {
          if (node.isTextblock) {
            const source = caseSensitive
              ? node.textContent
              : node.textContent.toLocaleLowerCase();

            const includes = source.includes(query);

            if (!includes) {
              return;
            }

            const matchedResult = matchText(
              query,
              source,
              offset,
              intraFileLimit,
            );

            let parentName = parent.type.name;
            if (parentName === 'doc') {
              parentName = node.type.name;
            }
            results.matches.push(
              ...matchedResult.map((m) => ({
                parent: parentName,
                match: m,
              })),
            );
          }
        });

        return results;
      });
    },
    {
      concurrency: CONCURRENCY,
      abortSignal: signal,
    },
  );

  let matchCount = 0;
  let interFileLimitReached = false;

  return docs.filter((r): r is SearchResultItem => {
    if (r == null || interFileLimitReached) {
      return false;
    }
    const currentMatchCount = r.matches.length;

    if (currentMatchCount === 0) {
      return false;
    }
    matchCount += currentMatchCount;

    // so that we can limit things for the next file
    if (matchCount >= interFileLimit) {
      interFileLimitReached = true;
    }

    return true;
  });
}

export function matchText(
  query: string,
  text: string,
  offset: number,
  limit?: number,
) {
  query = query.replace(/[-[\]{}()*+?.,\\^$|]/g, '\\$&');
  const regex1 = RegExp(query, 'g');
  let match;

  const result: string[][] = [];
  let count = 0;
  while ((match = regex1.exec(text)) !== null) {
    count++;
    const [start, end] = [match.index, match.index + match[0].length];
    if (limit && count > limit) {
      break;
    }
    result.push(getMatchFragment(text, start, end, offset));
  }

  return result;
}

export function getMatchFragment(
  str: string,
  start: number,
  end: number,
  offset: number,
) {
  const prefixStart = Math.max(0, start - offset);
  let prefix = str.substring(prefixStart, start).trimStart();
  if (prefixStart > 0) {
    // to avoid cutting of words start from
    prefix = startStringWithWord(prefix);
    prefix = '…' + prefix;
  }

  let suffix = str.substr(end, offset).trimEnd();
  if (end + offset < str.length) {
    suffix = endStringWithWord(suffix);
    suffix += '…';
  }

  return [prefix, str.slice(start, end), suffix];
}

export function startStringWithWord(str: string) {
  const whiteSpaceIndex = str.indexOf(' ');
  if (whiteSpaceIndex === -1) {
    return str;
  }
  // trim in case there is more white space at start
  return str.slice(whiteSpaceIndex + 1).trimStart();
}

export function endStringWithWord(str: string) {
  const whiteSpaceIndex = str.lastIndexOf(' ');
  if (whiteSpaceIndex === -1) {
    return str;
  }
  // trim in case there is more white space at end
  return str.slice(0, whiteSpaceIndex).trimEnd();
}
