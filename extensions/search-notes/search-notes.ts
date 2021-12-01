import type { Node } from '@bangle.dev/pm';

import { searchPmNode } from '@bangle.io/search-pm-node';

import { CONCURRENCY } from './constants';

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
) {
  return searchPmNode(
    query,
    noteWsPaths,
    getNote,
    signal,
    [
      {
        nodeName: 'tag',
        dataAttrName: 'tagValue',
        printStyle: (str) => '#' + str,
        queryIdentifier: 'tag:',
      },
      {
        nodeName: 'wikiLink',
        dataAttrName: 'path',
        printStyle: (str) => '[[' + str + ']]',
        queryIdentifier: 'backlink:',
      },
    ],
    {
      caseSensitive,
      maxChars,
      perFileMatchMax,
      totalMatchMax,
      concurrency: CONCURRENCY,
    },
  );
}
