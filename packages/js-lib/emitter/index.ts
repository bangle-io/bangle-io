type Listener<T> = (data: T) => void;

type Listeners = Record<string, Set<Listener<any>>>;

type EventPayload<E extends string, P> = {
  event: E;
  payload: P;
};

export class Emitter<T extends object = any> {
  // provides a way to create an emitter with discriminated union types
  static create<U extends EventPayload<string, any>>() {
    const emitter = new Emitter<{
      [K in U['event']]: U extends EventPayload<K, infer P> ? P : never;
    }>();
    return emitter;
  }
  private _callbacks: Listeners = {};

  private destroyed = false;

  destroy(): void {
    this._callbacks = {};
    this.destroyed = true;
  }

  emit<K extends keyof T>(event: K, data: T[K]): this {
    if (this.destroyed) {
      return this;
    }

    const callbacks = this._callbacks[event as string];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
    return this;
  }

  off<K extends keyof T>(event: K, fn?: Listener<T[K]>): this {
    if (this.destroyed) {
      return this;
    }

    const eventKey = event as string;
    const callbacks = this._callbacks[eventKey];
    if (callbacks) {
      if (fn) {
        callbacks.delete(fn);
      } else {
        callbacks.clear();
      }
    }

    return this;
  }

  clearListeners(): this {
    if (this.destroyed) {
      return this;
    }

    this._callbacks = {};
    return this;
  }

  on<K extends keyof T>(event: K, fn: Listener<T[K]>): this {
    if (this.destroyed) {
      return this;
    }

    const eventKey = event as string;
    let existing = this._callbacks[eventKey];

    if (!existing) {
      existing = new Set();
      this._callbacks[eventKey] = existing;
    }

    existing.add(fn);
    return this;
  }
}
