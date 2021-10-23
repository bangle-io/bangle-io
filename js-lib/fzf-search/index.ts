import { Fzf, byLengthAsc, byStartAsc, FzfOptions, FzfResultItem } from 'fzf';
import { useEffect, useState, useRef } from 'react';

export { byLengthAsc, byStartAsc };
export type { FzfOptions };
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
  options: FzfOptions<T>,
): FzfResultItem<T>[] {
  // TS is just not letting it use the options
  const optionsRef: any = useRef(options);
  const [fzf, updateFzf] = useState(() => new Fzf(items, optionsRef.current));
  useEffect(() => {
    updateFzf(new Fzf(items, optionsRef.current));
  }, [items, optionsRef]);

  return fzf.find(query);
}
