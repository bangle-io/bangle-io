import { Location } from '@bangle.io/ws-path';

import { BaseHistory } from './base-history';
import { BrowserHistory } from './browser-histroy';
import { createTo } from './create-to';

export function historyPush(
  history: BaseHistory,
  loc: Partial<Location>,
  { replace = false }: { replace?: boolean } = {},
) {
  setTimeout(() => {
    history?.navigate(createTo(loc, history), { replace: replace });
  }, 0);
}

export function historyStateUpdate(history: BaseHistory, state: any) {
  if (history instanceof BrowserHistory) {
    history.updateHistoryState(state);
  }
}
