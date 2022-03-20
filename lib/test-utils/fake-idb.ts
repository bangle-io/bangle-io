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
  getEverything = (customStore?: any) => {
    return Array.from((customStore || mockStore).entries());
  };

  createStore = (dbName: string, storeName: string): any => {
    const hash = dbName + '$' + storeName;
    if (customStores.has(hash)) {
      return customStores.get(hash);
    }
    let store = new Map();

    customStores.set(hash, store);

    return store as any;
  };

  get = async (key: IDBValidKey, customStore?: any) => {
    return (customStore || mockStore).get(key);
  };

  del = async (key: IDBValidKey, customStore?: any) => {
    (customStore || mockStore).delete(key);

    return;
  };

  set = async (key: IDBValidKey, value: any, customStore?: any) => {
    (customStore || mockStore).set(key, value);
  };

  keys = async (customStore?: any): Promise<any[]> => {
    return Array.from((customStore || mockStore).keys() as any);
  };

  getMany = async (keys: IDBValidKey[], customStore?: any) => {
    return Promise.resolve(
      Promise.all(keys.map((key) => this.get(key, customStore))),
    );
  };
}

export const fakeIdb = new FakeIdb();

export function clearFakeIdb() {
  mockStore.clear();
  customStores.forEach((map) => {
    map.clear();
  });
}
