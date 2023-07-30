/**
 * Works like a weak-map but accepts a pair keys
 */
export class DuoWeakMap<T extends object, V extends object, W> {
  rootMap = new WeakMap<T, WeakMap<V, W>>();

  get([key1, key2]: [T, V]): W | undefined {
    return this.rootMap.get(key1)?.get(key2);
  }

  has([key1, key2]: [T, V]): boolean {
    let map = this.rootMap.get(key1);

    if (map === undefined) {
      return false;
    }

    return map.has(key2);
  }

  set([key1, key2]: [T, V], val: W): void {
    let map = this.rootMap.get(key1);

    if (map === undefined) {
      map = new WeakMap();
      this.rootMap.set(key1, map);
    }

    map.set(key2, val);
  }
}
