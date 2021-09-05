import { pMap } from './p-map';
import { SearchResultItem } from './types';
import type { Node } from '@bangle.dev/pm';

export const CONCURRENCY = 10;

export async function searchNotes(
  query: string,
  noteWsPaths: string[],
  getNote: (wsPath: string) => Promise<Node<any>>,
  signal: AbortSignal,
  {
    caseSensitive = false,
    maxChars = 75,
    perFileMatchMax = 200,
    totalMatchMax = 5000,
  } = {},
): Promise<SearchResultItem[]> {
  if (query === '') {
    return [];
  }

  query = query.slice(0, 500);

  query = caseSensitive ? query : query.toLocaleLowerCase();
  const docs = await pMap(
    noteWsPaths,
    (wsPath) => {
      return getNote(wsPath).then((doc) => {
        if (signal.aborted) {
          return null;
        }

        let perFileMatchCount = 0;

        const results: SearchResultItem = {
          wsPath,
          matches: [],
        };
        doc.descendants((node, pos, parent) => {
          if (perFileMatchCount > perFileMatchMax) {
            return false;
          }
          if (node.isTextblock) {
            const source = caseSensitive
              ? node.textContent
              : node.textContent.toLocaleLowerCase();

            const includes = source.includes(query);

            if (!includes) {
              return true;
            }

            let parentName = parent.type.name;
            if (parentName === 'doc') {
              parentName = node.type.name;
            }

            let matchedResult = matchText(
              query,
              source,
              maxChars,
              perFileMatchMax,
            );

            perFileMatchCount += matchedResult.length;

            results.matches.push(
              ...matchedResult.map((m) => ({
                parent: parentName,
                parentPos: pos,
                match: m,
              })),
            );
          }
          return true;
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
  let limitReached = false;

  return docs.filter((r): r is SearchResultItem => {
    if (r == null || limitReached) {
      return false;
    }
    const currentMatchCount = r.matches.length;

    if (currentMatchCount === 0) {
      return false;
    }
    matchCount += currentMatchCount;

    // so that we can limit things for the next file and not truncate
    // current file, to avoid the edge case of 1 file having many results
    // and not showing it.
    if (matchCount >= totalMatchMax) {
      limitReached = true;
    }

    return true;
  });
}

export function matchText(
  query: string,
  text: string,
  maxChars: number,
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
    result.push(getMatchFragment(text, start, end, maxChars));
  }

  return result;
}

export function getMatchFragment(
  str: string,
  start: number,
  end: number,
  maxChars: number,
) {
  const prefixStart = Math.max(0, start - maxChars);
  let prefix = str.substring(prefixStart, start).trimStart();
  if (prefixStart > 0) {
    // to avoid cutting of words start from
    prefix = startStringWithWord(prefix);
    prefix = '…' + prefix;
  }

  let suffix = str.substr(end, maxChars).trimEnd();
  if (end + maxChars < str.length) {
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
