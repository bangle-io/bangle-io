import type { BaseHistory } from './base-history';
import type { Location } from './types';

export class MemoryHistory implements BaseHistory {
  private _currentLoc: Location;

  // TODO implement base
  constructor(
    private _base = '',
    private _onChange: (location: Location) => void,
  ) {
    this._currentLoc = {
      pathname: '',
      search: '',
    };
  }

  get pathname() {
    return this._currentLoc.pathname;
  }

  get search() {
    return this._currentLoc.search;
  }

  destroy(): void {}

  navigate(to: string, { replace = false }: { replace?: boolean } = {}): void {
    const parsed = new URL('http://bangle.io' + to);
    const newLoc = {
      pathname: parsed.pathname,
      search: parsed.search.startsWith('?')
        ? parsed.search.slice(1)
        : parsed.search,
    };

    if (!isLocationEqual(newLoc, this._currentLoc)) {
      this._currentLoc = newLoc;
      Promise.resolve().then(() => {
        this._onChange(newLoc);
      });
    }
  }
}

const isLocationEqual = (a: Location, b: Location) => {
  return a.pathname === b.pathname && a.search === b.search;
};
