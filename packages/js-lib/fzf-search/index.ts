import type { AsyncFzfOptions, FzfOptions, FzfResultItem } from 'fzf';
import { Fzf } from 'fzf';
import type { ArrayElement, SyncOptionsTuple } from 'fzf/dist/types/finders';
import { useEffect, useMemo, useRef, useState } from 'react';

export type { AsyncFzfOptions, FzfOptions, FzfResultItem };
export { AsyncFzf, byLengthAsc, byStartAsc, Fzf } from 'fzf';

/**
 *
 * @param items - The items to search on
 * @param query - The result
 * @param options - Options are initialized once and changing it will not have any affect
 * @returns
 */
export function useFzfSearch<T extends readonly any[]>(
  items: T,
  query: string,
  ...options: SyncOptionsTuple<ArrayElement<T>>
) {
  // TS is just not letting it use the options
  const optionsRef: any = useRef(options);
  const [fzf, updateFzf] = useState(
    () => new Fzf(items, ...optionsRef.current),
  );
  useEffect(() => {
    updateFzf(new Fzf(items, ...optionsRef.current));
  }, [items, optionsRef]);

  return useMemo(() => {
    return fzf.find(query);
  }, [fzf, query]);
}
