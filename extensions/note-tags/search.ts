import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Node } from '@bangle.dev/pm';

import { nsmApi2 } from '@bangle.io/api';
import { byLengthAsc, useFzfSearch } from '@bangle.io/fzf-search';
import { isAbortError } from '@bangle.io/mini-js-utils';
import type { WsPath } from '@bangle.io/shared-types';

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
  wsPaths: readonly WsPath[],
  getDoc: (wsPath: WsPath) => Promise<Node | undefined>,
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
      tagSet.forEach((t) => {
        result.add(t);
      });
    }
  }

  return [...result];
}

export function useSearchAllTags(query: string, isVisible: boolean): string[] {
  const { noteWsPaths = [] } = nsmApi2.workspace.useWorkspace();
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    if (isVisible) {
      const getNoteForTags = (wsPath: WsPath) =>
        nsmApi2.workspace.getNote(wsPath).catch((error) => {
          // Ignore errors as this is not a great place to handle errors
          return undefined;
        });

      listAllTags(noteWsPaths, getNoteForTags, controller.signal)
        .then((tags) => {
          console.log('allTags', tags);

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
  }, [noteWsPaths, isVisible]);

  const fzfItems = useFzfSearch(allTags, query, {
    limit: FZF_SEARCH_LIMIT,
    tiebreakers: [byLengthAsc],
    selector: (item) => item,
  });

  return useMemo(() => {
    let r = fzfItems.map((r) => r.item);
    console.log('search items', r);

    return r;
  }, [fzfItems]);
}
