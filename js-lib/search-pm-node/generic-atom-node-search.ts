import type { Node } from '@bangle.dev/pm';

import type { SearchMatch } from './types';

export function genericAtomNodeSearch(
  doc: Node,
  node: Node,
  pos: number,
  parent: Node,
  query: string,
  {
    caseSensitive,
    maxChars,
    nodeName,
    dataAttrName,
    queryIdentifier,
    printBefore = '',
    printAfter = '',
  }: {
    caseSensitive: boolean;
    maxChars: number;
    nodeName: string;
    dataAttrName: string;
    queryIdentifier: string;
    printBefore?: string;
    printAfter?: string;
  },
): SearchMatch | undefined {
  if (node.type.name !== nodeName) {
    return undefined;
  }

  const dataValue = caseSensitive
    ? node.attrs[dataAttrName]
    : node.attrs[dataAttrName].toLocaleLowerCase();
  const parsedQuery = query.split(queryIdentifier)[1];

  if (
    dataValue !== parsedQuery &&
    // allow for search xyz:*
    parsedQuery !== '*'
  ) {
    return undefined;
  }

  let parentName = parent.type.name;

  if (parentName === 'doc') {
    parentName = node.type.name;
  }

  const prevNode = doc.resolve(pos).nodeBefore;
  let textBefore = '';

  if (!prevNode) {
    textBefore = '';
  } else {
    textBefore = getCheapTextBefore(doc, pos, maxChars);

    // See if we cut through some text, if yes, show ellipsis
    if (textBefore.length < getCheapTextBefore(doc, pos, maxChars + 1).length) {
      textBefore = '…' + textBefore;
    }
    if (textBefore.length > 0) {
      textBefore = textBefore + ' ';
    }
  }

  let textAfter = '';
  // adding 1 to position to skip past the node
  const nextNode = doc.resolve(pos + 1).nodeAfter;

  if (!nextNode) {
    textAfter = '';
  } else {
    textAfter = getCheapTextAfter(doc, pos, maxChars);

    // See if we cut through some text, if yes, show ellipsis
    if (textAfter.length < getCheapTextAfter(doc, pos, maxChars + 1).length) {
      textAfter = textAfter + '…';
    }
    if (textAfter.length > 0) {
      textAfter = ' ' + textAfter;
    }
  }

  return {
    parent: parentName,
    parentPos: pos,
    match: [
      textBefore,
      printBefore + node.attrs[dataAttrName] + printAfter,
      textAfter,
    ],
  };
}
// TODO move to something better
const UNIQUE_SEPARATOR = '_%$$%_';

function getCheapTextBefore(doc: Node, pos: number, maxChars: number) {
  const textBeforeArray = doc
    .textBetween(
      Math.max(pos - maxChars, 0),
      pos,
      UNIQUE_SEPARATOR,
      '🖼️', // TODO stopgap until we find a better way to get text for non text leaf node
    )
    .split(UNIQUE_SEPARATOR);

  return (textBeforeArray[textBeforeArray.length - 1] || '').trim();
}

function getCheapTextAfter(doc: Node, pos: number, maxChars: number) {
  const textAfterArray = doc
    .textBetween(
      pos + 1,
      Math.min(pos + maxChars, doc.content.size),
      UNIQUE_SEPARATOR,
      '🖼️',
    )
    .split(UNIQUE_SEPARATOR);

  return (textAfterArray[0] || '').trim();
}
