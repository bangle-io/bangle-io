import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Node } from '@bangle.dev/pm';

import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import { getNote, useWorkspaceContext } from '@bangle.io/slice-workspace';

const FZF_SEARCH_LIMIT = 16;

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
  getDoc: (wsPath: string) => Promise<Node<any> | undefined>,
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
    if (doc) {
      const tagSet = _listTags(doc);
      tagSet.forEach((t) => result.add(t));
    }
  }

  return [...result];
}

export function useSearchAllTags(query: string, isVisible: boolean): string[] {
  const { noteWsPaths = [], bangleStore } = useWorkspaceContext();
  const [allTags, setAllTags] = useState<string[]>([]);

  const getNoteForTags = useCallback(
    (wsPath: string) => {
      return getNote(wsPath)(
        bangleStore.state,
        bangleStore.dispatch,
        bangleStore,
      );
    },
    [bangleStore],
  );

  useEffect(() => {
    const controller = new AbortController();
    if (isVisible) {
      listAllTags(noteWsPaths, getNoteForTags, controller.signal)
        .then((tags) => {
          setAllTags(tags);
        })
        .catch((error) => {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          throw error;
        });
    }
    return () => {
      controller.abort();
    };
  }, [noteWsPaths, getNoteForTags, isVisible]);

  const fzfItems = useFzfSearch(allTags, query, {
    limit: FZF_SEARCH_LIMIT,
    tiebreakers: [byLengthAsc],
  });

  return useMemo(() => {
    return fzfItems.map((r) => r.item);
  }, [fzfItems]);
}
