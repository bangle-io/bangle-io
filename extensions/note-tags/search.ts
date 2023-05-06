import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Node } from '@bangle.dev/pm';

import { nsmApi, useNsmPlainStore, useNsmSliceState } from '@bangle.io/api';
import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import { isAbortError } from '@bangle.io/utils';

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
  getDoc: (wsPath: string) => Promise<Node | undefined>,
  signal?: AbortSignal,
): Promise<string[]> {
  let destroyed = false;
  signal?.addEventListener(
    'abort',
    (e) => {
      destroyed = true;
    },
    {
      once: true,
    },
  );

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
  const { noteWsPaths = [] } = useNsmSliceState(
    nsmApi.workspace.nsmSliceWorkspace,
  );
  const [allTags, setAllTags] = useState<string[]>([]);
  const nsmStore = useNsmPlainStore();

  const getNoteForTags = useCallback(
    (wsPath: string) => {
      return nsmApi.workspace.getNote(nsmStore, wsPath).catch((error) => {
        // Ignore errors as this is not a great place to handle errors
        return undefined;
      });
    },
    [nsmStore],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (isVisible) {
      listAllTags(noteWsPaths, getNoteForTags, controller.signal)
        .then((tags) => {
          setAllTags(tags);
        })
        .catch((error) => {
          if (isAbortError(error)) {
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
    selector: (item) => item,
  });

  return useMemo(() => {
    let r = fzfItems.map((r) => r.item);

    return r;
  }, [fzfItems]);
}
