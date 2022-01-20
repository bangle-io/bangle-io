import * as IDB from 'idb-keyval';

const mockStore = new Map<IDBValidKey, any>();
let customStores = new Map<string, typeof mockStore>();

interface IdbType {
  get: typeof IDB.get;
  del: typeof IDB.del;
  set: typeof IDB.set;
  keys: typeof IDB.keys;
  createStore: typeof IDB.createStore;
}

class FakeIdb implements IdbType {
  constructor() {
    this.createStore = jest.fn(this.createStore.bind(this));
    this.get = jest.fn(this.get.bind(this));
    this.del = jest.fn(this.del.bind(this));
    this.set = jest.fn(this.set.bind(this));
    this.keys = jest.fn(this.keys.bind(this));
  }

  clearMocks() {
    this.createStore = jest.fn(this.createStore.bind(this));
    this.get = jest.fn(this.get.bind(this));
    this.del = jest.fn(this.del.bind(this));
    this.set = jest.fn(this.set.bind(this));
    this.keys = jest.fn(this.keys.bind(this));
  }

  createStore(dbName: string, storeName: string): any {
    const hash = dbName + '$' + storeName;
    if (customStores.has(hash)) {
      return customStores.get(hash);
    }
    let store = new Map();

    customStores.set(hash, store);

    return store as any;
  }

  async get(key: IDBValidKey, customStore?: any) {
    return (customStore || mockStore).get(key);
  }

  async del(key: IDBValidKey, customStore?: any) {
    (customStore || mockStore).delete(key);
    return;
  }

  async set(key: IDBValidKey, value: any, customStore?: any) {
    (customStore || mockStore).set(key, value);
  }

  async keys(customStore?: any): Promise<any[]> {
    return Array.from((customStore || mockStore).keys() as any);
  }
}

export const fakeIdb = new FakeIdb();

export function clearFakeIdb() {
  fakeIdb.clearMocks();
  mockStore.clear();
  customStores.forEach((map) => {
    map.clear();
  });
}
