import type { Node } from '@bangle.dev/pm';

import { CONCURRENCY, SearchResultItem } from './constants';
import { genericAtomNodeSearch } from './generic-atom-node-search';
import { pMap } from './p-map';

const TEXT_SEARCH = 'TEXT_SEARCH' as const;
const TAG_SEARCH = 'TAG_SEARCH' as const;
const BACKLINK_SEARCH = 'BACKLINK_SEARCH' as const;

const TagSearch = { name: TAG_SEARCH, identifier: 'tag:' };
const BacklinkSearch = {
  name: BACKLINK_SEARCH,
  identifier: 'backlink:',
};

type SearchType =
  | typeof TEXT_SEARCH
  | typeof TAG_SEARCH
  | typeof BACKLINK_SEARCH;

function getSearchType(query): SearchType {
  for (const { name, identifier } of [TagSearch, BacklinkSearch]) {
    if (
      query.startsWith(identifier) &&
      !query.startsWith(identifier + ':') &&
      query.length > identifier.length
    ) {
      return name;
    }
  }

  return TEXT_SEARCH;
}
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

  let searchType = getSearchType(query);

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
              const tagResult = genericAtomNodeSearch(
                doc,
                node,
                pos,
                parent,
                query,
                {
                  caseSensitive,
                  maxChars,
                  dataAttrName: 'tagValue',
                  nodeName: 'tag',
                  queryIdentifier: TagSearch.identifier,
                  printStyle: '#',
                },
              );
              if (tagResult) {
                results.matches.push(tagResult);
              }
              break;
            }
            case BACKLINK_SEARCH: {
              const result = genericAtomNodeSearch(
                doc,
                node,
                pos,
                parent,
                query,
                {
                  caseSensitive,
                  maxChars,
                  dataAttrName: 'path',
                  nodeName: 'wikiLink',
                  queryIdentifier: BacklinkSearch.identifier,
                  printStyle: (s) => `[[${s}]]`,
                },
              );
              if (result) {
                results.matches.push(result);
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
