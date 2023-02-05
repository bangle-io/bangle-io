export class Transaction<K extends string, P extends unknown[]> {
  private _metadata: Record<string, unknown> = Object.create(null);

  constructor(
    public readonly sliceKey: K,
    public readonly payload: P,
    public readonly actionId: string,
  ) {}

  get originator() {
    return this.sliceKey + ':' + this.actionId;
  }

  getMetadata(key: string) {
    return this._metadata[key];
  }

  setMetadata(key: string, val: unknown) {
    this._metadata[key] = val;
  }
}
