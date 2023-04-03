export const TX_META_DISPATCH_SOURCE = 'DEBUG_DISPATCH_SOURCE';
export const TX_META_STORE_TX_ID = 'store-tx-id';
export const TX_META_STORE_NAME = 'store-name';

export class Transaction<K extends string, P extends unknown[]> {
  private _metadata: Record<string, string> = Object.create(null);

  constructor(
    public readonly sliceKey: K,
    public readonly payload: P,
    public readonly actionId: string,
  ) {}

  appendMetadata(key: string, val: string) {
    let existing = this.getMetadata(key);
    this.setMetadata(key, existing ? existing + ',' + val : val);
  }

  getMetadata(key: string) {
    return this._metadata[key];
  }

  setMetadata(key: string, val: string) {
    this._metadata[key] = val;
  }
}
