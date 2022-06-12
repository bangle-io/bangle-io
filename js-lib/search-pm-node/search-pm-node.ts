import type { Node } from '@bangle.dev/pm';

import { pMap } from '@bangle.io/p-map';

import { DEFAULT_CONCURRENCY } from './config';
import { genericAtomNodeSearch } from './generic-atom-node-search';
import type { SearchResultItem } from './types';

export interface AtomSearchTypes {
  nodeName: string;
  queryIdentifier: string;
  // what to print before atom node
  // for example you want to show '[[' before and  ']]' after
  // if the node is backlink
  printBefore?: string;
  printAfter?: string;
  dataAttrName: string;
}

function getAtomSearchType(
  query: string,
  atomSearchTypes: AtomSearchTypes[],
): AtomSearchTypes | undefined {
  return atomSearchTypes.find(
    (atom) =>
      query.startsWith(atom.queryIdentifier) &&
      query.length > atom.queryIdentifier.length,
  );
}
export async function searchPmNode(
  signal: AbortSignal,
  query: string,
  docUids: string[],
  getDoc: (uid: string) => Promise<Node | undefined>,
  atomSearchTypes: AtomSearchTypes[] = [],
  {
    concurrency = DEFAULT_CONCURRENCY,
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

  let atomSearchType = getAtomSearchType(query, atomSearchTypes);

  const docs = await pMap(
    docUids,
    (uid) => {
      return getDoc(uid).then((doc) => {
        if (signal.aborted || !doc) {
          return null;
        }

        let perFileMatchCount = 0;

        const results: SearchResultItem = {
          uid,
          matches: [],
        };
        doc.descendants((node, pos, parent) => {
          if (perFileMatchCount > perFileMatchMax || !parent) {
            return false;
          }

          let parentName = parent.type.name;

          if (parentName === 'doc') {
            parentName = node.type.name;
          }

          // perform vanilla text search
          if (!atomSearchType) {
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
          } else {
            const result = genericAtomNodeSearch(
              doc,
              node,
              pos,
              parent,
              query,
              {
                caseSensitive,
                maxChars,
                dataAttrName: atomSearchType.dataAttrName,
                nodeName: atomSearchType.nodeName,
                queryIdentifier: atomSearchType.queryIdentifier,
                printBefore: atomSearchType.printBefore,
                printAfter: atomSearchType.printAfter,
              },
            );

            if (result) {
              results.matches.push(result);
            }
          }

          return true;
        });

        return results;
      });
    },
    {
      concurrency: concurrency,
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
    const [start, end] = [match.index, match.index + match[0]!.length];

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
