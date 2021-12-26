import type { History as _History } from 'history';

export type History = _History;

export class HistoryState {
  constructor(
    private mainFields: {
      history?: HistoryState['history'];
    },
    private opts: any = {},
  ) {}

  updateState(
    obj: Partial<ConstructorParameters<typeof HistoryState>[0]>,
  ): HistoryState {
    return new HistoryState(Object.assign({}, this.mainFields, obj), this.opts);
  }

  replace(newLocation: Parameters<History['replace']>[0]) {
    // TODO if I remove the setTimeouts
    // very very very strange things happen
    // magically the current call goes silent event though it is not async
    // and next things in event loop run and after that
    // this line continues, causing problems with action dispatches.
    setTimeout(() => {
      this.history?.replace(newLocation);
    }, 0);

    return new HistoryState(Object.assign({}, this.mainFields), this.opts);
  }

  push(newLocation: Parameters<History['push']>[0]) {
    setTimeout(() => {
      this.history?.push(newLocation);
    }, 0);

    return new HistoryState(Object.assign({}, this.mainFields), this.opts);
  }

  updateHistoryState(obj) {
    if (!this.history) {
      return;
    }
    const loc = this.history.location;
    const locState = this.history.location.state as any;
    this.history?.replace({
      ...loc,
      state: {
        ...locState,
        ...obj,
      },
    });
  }

  // mainFields
  get history(): History | undefined {
    return this.mainFields.history;
  }

  // derived
  get location() {
    return this.history?.location;
  }
  get pathname() {
    return this.history?.location.pathname;
  }
  get search() {
    return this.history?.location.search;
  }
}
