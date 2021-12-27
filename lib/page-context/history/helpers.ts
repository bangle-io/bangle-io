import { BaseHistory } from './base-history';

export function historyPush(
  history: BaseHistory,
  loc: Partial<Location>,
  { replace = false }: { replace?: boolean } = {},
) {
  setTimeout(() => {
    history?.navigate(createTo(loc, history), { replace: replace });
  }, 0);
}

export function historyStateUpdate(history: BaseHistory, state: any) {}

export function createTo(loc: Partial<Location>, history: BaseHistory) {
  const path =
    typeof loc.pathname === 'string' ? loc.pathname : history?.pathname;

  const search = typeof loc.search === 'string' ? loc.search : history?.search;

  return path + (search ? '?' + search : '');
}
