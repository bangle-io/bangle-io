import type { Node } from '@bangle.dev/pm';

export function _listTags(doc: Node) {
  const results = new Set<string>();
  doc.descendants((node, pos, parent) => {
    if (node.type.name === 'tag') {
      results.add(node.attrs.tagValue);
    }
  });
  return results;
}

/**
 * List tags across all wsPaths
 */
export async function listAllTags(
  wsPaths: string[],
  getDoc: (wsPath: string) => Promise<Node<any>>,
  signal?: AbortSignal,
): Promise<string[]> {
  let destroyed = false;
  signal?.addEventListener('abort', (e) => {
    destroyed = true;
  });

  const result = new Set<string>();

  for (const wsPath of wsPaths) {
    if (destroyed) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const doc = await getDoc(wsPath);
    if (destroyed) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const tagSet = _listTags(doc);
    tagSet.forEach((t) => result.add(t));
  }

  return [...result];
}
