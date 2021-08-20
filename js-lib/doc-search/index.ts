import type { Node } from '@bangle.dev/pm';

interface SearchResult {
  parent: string;
  parentPos: number;
}

export default function docSearch(
  query: string,
  doc: Node,
  signal: AbortSignal,
) {
  doc.descendants((node, pos, parent) => {});
}

export function tagSearch(query: string, doc: Node) {
  const results: { pos: number; nodeAttrs: any }[] = [];
  doc.descendants((node, pos, parent) => {
    if (node.type.name === 'tag') {
      if (query && query === node.attrs.tagValue) {
        results.push({
          pos,
          nodeAttrs: node.attrs,
        });
      } else {
        results.push({
          pos,
          nodeAttrs: node.attrs,
        });
      }
    }
  });

  return results;
}
