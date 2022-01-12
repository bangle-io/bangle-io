import { BaseHistory } from './base-history';
import { Location } from './types';

export class MemoryHistory extends BaseHistory {
  private host = typeof window !== 'undefined' ? window : undefined;
  private currentLoc: Location;

  // TODO implement base
  constructor(base = '', onChange: (location: Location) => void) {
    super(base, onChange);
    this.currentLoc = {
      pathname: '',
      search: '',
    };
  }

  destroy(): void {}

  navigate(to: string): void {
    const parsed = new URL('http://bangle.io' + to);
    const newLoc = {
      pathname: parsed.pathname,
      search: parsed.search?.startsWith('?')
        ? parsed.search.slice(1)
        : parsed.search,
    };

    if (!isLocationEqual(newLoc, this.currentLoc)) {
      this.currentLoc = newLoc;
      this.onChange(newLoc);
    }
  }

  get pathname() {
    return this.currentLoc.pathname;
  }

  get search() {
    return this.currentLoc.search;
  }
}

const isLocationEqual = (a: Location, b: Location) => {
  return a.pathname === b.pathname && a.search === b.search;
};
