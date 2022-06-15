import type { BaseHistory } from './base-history';
import { createTo } from './create-to';
import {
  eventPushState,
  eventReplaceState,
  historyEvents,
} from './patch-history';
import type { Location } from './types';

export class BrowserHistory implements BaseHistory {
  private _checkForUpdates = () => {
    const current = calcLocation(this._base);

    if (!isLocationEqual(current, this._currentLoc)) {
      this._currentLoc = current;
      this._onChange(current);
    }
    this.refreshHistoryState();
  };

  private _currentLoc: Location;
  private _historyCounter = 0;
  private _historyState: any;

  private _host = typeof window !== 'undefined' ? window : undefined;

  constructor(
    private _base = '',
    private _onChange: (location: Location) => void,
  ) {
    historyEvents.forEach((e) =>
      this._host?.addEventListener(e, this._checkForUpdates),
    );
    this._currentLoc = calcLocation(this._base);
  }

  // we do a simple managed history state, where we assume
  get pathname() {
    return this._currentLoc.pathname;
  }

  get search() {
    return this._currentLoc.search;
  }

  destroy(): void {
    historyEvents.forEach((e) =>
      this._host?.removeEventListener(e, this._checkForUpdates),
    );
  }

  navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
    // TODO if I remove the setTimeouts
    // very very very strange things happen
    // magically the current call even loop goes silent even though it is not async
    // and next things in event loop run and after that
    // this loop resume, causing problems elsewhere action dispatches.
    setTimeout(() => {
      window.history[replace ? eventReplaceState : eventPushState](
        this._createHistoryState(),
        '',
        this._base + to,
      );
    }, 0);
  }

  // any state added to history is by us.
  refreshHistoryState() {
    // In certain cases like historyPop, the job of this function is
    // to set it back to the value it last held.
    if (window.history.state == null && this._historyState) {
      this.updateHistoryState(this._historyState);
    }
  }

  updateHistoryState(hState: any) {
    this._historyState = hState;
    setTimeout(() => {
      const to = createTo(
        {
          pathname: this.pathname,
          search: this.search,
        },
        this,
      );
      window.history[eventReplaceState](
        this._createHistoryState(),
        '',
        this._base + to,
      );
    }, 0);
  }

  private _createHistoryState() {
    return { key: this._historyCounter++, value: this._historyState || null };
  }
}

const getCurrentPathname = (): string => {
  return getDocumentLocation().pathname;
};

const currentPathname = (base: string, path = getCurrentPathname()) =>
  path.slice(base.length) || '/';

const getDocumentLocation = (): Document['location'] => {
  if (typeof window !== 'undefined') {
    return window.location;
  }
  throw new Error('Expected to be run in window');
};

const calcLocation = (base: string): Location => {
  const pathname = currentPathname(base);
  let search = getDocumentLocation().search;

  // keep search free of `?`
  if (search.startsWith('?')) {
    search = search.slice(1);
  }

  return { pathname, search };
};

export const isLocationEqual = (a: Location, b: Location) => {
  return a.pathname === b.pathname && a.search === b.search;
};
