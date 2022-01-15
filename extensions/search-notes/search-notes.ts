import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { CONCURRENCY } from './constants';

export async function searchNotes(
  signal: AbortSignal,
  query: string,
  wsName: string,
  {
    caseSensitive = false,
    maxChars = 75,
    perFileMatchMax = 200,
    totalMatchMax = 2000,
  } = {},
) {
  return naukarProxy.abortableSearchWsForPmNode(
    signal,
    wsName,
    query,
    [
      {
        nodeName: 'tag',
        dataAttrName: 'tagValue',
        printBefore: '#',
        queryIdentifier: 'tag:',
      },
      {
        nodeName: 'wikiLink',
        dataAttrName: 'path',
        printBefore: '[[',
        printAfter: ']]',
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
