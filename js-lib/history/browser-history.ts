import { BaseHistory } from './base-history';
import { createTo } from './create-to';
import {
  eventPushState,
  eventReplaceState,
  historyEvents,
} from './patch-history';
import { Location } from './types';

export class BrowserHistory implements BaseHistory {
  private host = typeof window !== 'undefined' ? window : undefined;
  private currentLoc: Location;

  private historyState: any;
  private historyCounter = 0;

  private checkForUpdates = () => {
    const current = calcLocation(this.base);

    if (!isLocationEqual(current, this.currentLoc)) {
      this.currentLoc = current;
      this.onChange(current);
    }
    this.refreshHistoryState();
  };

  constructor(
    private base = '',
    private onChange: (location: Location) => void,
  ) {
    historyEvents.forEach((e) =>
      this.host?.addEventListener(e, this.checkForUpdates),
    );
    this.currentLoc = calcLocation(this.base);
  }

  // we do a simple managed history state, where we assume
  get pathname() {
    return this.currentLoc.pathname;
  }

  get search() {
    return this.currentLoc.search;
  }

  private createHistoryState() {
    return { key: this.historyCounter++, value: this.historyState || null };
  }

  destroy(): void {
    historyEvents.forEach((e) =>
      this.host?.removeEventListener(e, this.checkForUpdates),
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
        this.createHistoryState(),
        '',
        this.base + to,
      );
    }, 0);
  }

  // any state added to history is by us.
  refreshHistoryState() {
    // In certain cases like historyPop, the job of this function is
    // to set it back to the value it last held.
    if (window.history.state == null && this.historyState) {
      this.updateHistoryState(this.historyState);
    }
  }

  updateHistoryState(hState: any) {
    this.historyState = hState;
    setTimeout(() => {
      const to = createTo(
        {
          pathname: this.pathname,
          search: this.search,
        },
        this,
      );
      window.history[eventReplaceState](
        this.createHistoryState(),
        '',
        this.base + to,
      );
    }, 0);
  }
}

const getCurrentPathname = (): string => {
  return getDocumentLocation()?.pathname;
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
