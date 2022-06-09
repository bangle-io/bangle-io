import type { BaseHistory } from './base-history';
import type { Location } from './types';

export function createTo(loc: Partial<Location>, history: BaseHistory) {
  if (loc.search?.startsWith('?')) {
    throw new Error('Location search cannot start with ?');
  }
  const path =
    typeof loc.pathname === 'string' ? loc.pathname : history.pathname;

  const search = typeof loc.search === 'string' ? loc.search : history.search;

  return path + (search ? '?' + search : '');
}
