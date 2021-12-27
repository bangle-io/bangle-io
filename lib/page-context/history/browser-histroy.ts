import { BaseHistory } from './base-history';
import {
  eventPushState,
  eventReplaceState,
  historyEvents,
} from './patch-history';
import { Location } from './types';

export class BrowserHistory extends BaseHistory {
  private host = typeof window !== 'undefined' ? window : undefined;
  private currentLoc: Location;

  constructor(base = '', onChange: (location: Location) => void) {
    super(base, onChange);

    historyEvents.forEach((e) =>
      this.host?.addEventListener(e, this.checkForUpdates),
    );
    this.currentLoc = calcLocation(this.base);
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
        null,
        '',
        // handle nested routers and absolute paths
        to[0] === '~' ? to.slice(1) : this.base + to,
      );
    }, 0);
  }

  get pathname() {
    return this.currentLoc.pathname;
  }

  get search() {
    return this.currentLoc.search;
  }

  private checkForUpdates = () => {
    const current = calcLocation(this.base);

    if (!isLocationEqual(current, this.currentLoc)) {
      this.currentLoc = current;
      this.onChange(current);
    }
  };
}

const getCurrentPathname = (): string => {
  return getDocumentLocation()?.pathname;
};

const currentPathname = (base: string, path = getCurrentPathname()) =>
  !path.toLowerCase().indexOf(base.toLowerCase())
    ? path.slice(base.length) || '/'
    : '~' + path;

const getDocumentLocation = (): Document['location'] => {
  if (typeof window !== 'undefined') {
    return window.location;
  }
  throw new Error('Expected to be run in window');
};

const calcLocation = (base: string): Location => {
  const pathname = currentPathname(base);
  const search = getDocumentLocation().search;
  return { pathname, search };
};

const isLocationEqual = (a: Location, b: Location) => {
  return a.pathname === b.pathname && a.search === b.search;
};
