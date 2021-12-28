import { Location } from '@bangle.io/ws-path';

import { BaseHistory } from './base-history';

export function createTo(loc: Partial<Location>, history: BaseHistory) {
  const path =
    typeof loc.pathname === 'string' ? loc.pathname : history?.pathname;

  const search = typeof loc.search === 'string' ? loc.search : history?.search;

  return path + (search ? '?' + search : '');
}
