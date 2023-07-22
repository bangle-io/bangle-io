import type { WsName } from '@bangle.io/shared-types';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';

import { CONCURRENCY } from './constants';

export async function searchNotes(
  signal: AbortSignal,
  query: string,
  wsName: WsName,
  {
    caseSensitive = false,
    maxChars = 75,
    perFileMatchMax = 200,
    totalMatchMax = 2000,
  } = {},
) {
  const result = await naukarProxy.abortable.abortableSearchWsForPmNode(
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

  return result;
}
