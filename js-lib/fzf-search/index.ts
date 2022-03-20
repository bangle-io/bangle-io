import { byLengthAsc, byStartAsc, Fzf, FzfOptions, FzfResultItem } from 'fzf';
import { useEffect, useMemo, useRef, useState } from 'react';

export type { FzfOptions, FzfResultItem };
export { byLengthAsc, byStartAsc, Fzf };
/**
 *
 * @param items - The items to search on
 * @param query - The result
 * @param options - Options are initialized once and changing it will not have any affect
 * @returns
 */
export function useFzfSearch<T = string>(
  items: T[],
  query: string,
  ...options: Array<FzfOptions<T>>
): Array<FzfResultItem<T>> {
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
