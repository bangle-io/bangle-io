import { pMap } from './p-map';
import { SearchResultItem } from './types';
import type { Node } from '@bangle.dev/pm';

export const CONCURRENCY = 10;
const TEXT_SEARCH = 'TEXT_SEARCH';
const TAG_SEARCH = 'TAG_SEARCH';
type SearchType = typeof TEXT_SEARCH | typeof TAG_SEARCH;

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
  // TODO move this to throw error
  query = query.slice(0, 500);

  query = caseSensitive ? query : query.toLocaleLowerCase();

  let searchType: SearchType = TEXT_SEARCH;

  if (
    query.startsWith('tag:') &&
    !query.startsWith('tag::') &&
    query.length > 'tag:'.length
  ) {
    searchType = TAG_SEARCH;
  }

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

          let parentName = parent.type.name;
          if (parentName === 'doc') {
            parentName = node.type.name;
          }
          switch (searchType) {
            case TEXT_SEARCH: {
              if (node.isTextblock) {
                const source = caseSensitive
                  ? node.textContent
                  : node.textContent.toLocaleLowerCase();

                const includes = source.includes(query);

                if (!includes) {
                  return true;
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
              break;
            }

            case TAG_SEARCH: {
              // TODO this is coupled to the tag extension
              if (
                node.type.name === 'tag' &&
                node.attrs.tagValue === query.split('tag:')[1]
              ) {
                // TODO move to something better
                const UNIQUE_SEPARATOR = '_%$$%_';

                const textBeforeArray = doc
                  .textBetween(
                    Math.max(pos - maxChars, 0),
                    pos,
                    UNIQUE_SEPARATOR,
                    ' ',
                  )
                  .split(UNIQUE_SEPARATOR);

                const textBefore = textBeforeArray[textBeforeArray.length - 1];
                const textAfterArray = doc
                  .textBetween(
                    pos,
                    Math.min(pos + maxChars, doc.content.size),
                    UNIQUE_SEPARATOR,
                  )
                  .split(UNIQUE_SEPARATOR);

                const textAfter = textAfterArray[0];

                results.matches.push({
                  parent: parentName,
                  parentPos: pos,
                  match: [
                    (textBefore ? textBefore : '') + ' ',
                    '#' + node.attrs.tagValue,
                    textAfter ? textAfter : '',
                  ],
                });
              }
              break;
            }

            default: {
              throw new Error('Unknown search type');
            }
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
