type Listener<T> = (data: T) => void;

type Listeners = Record<string, Set<Listener<any>>>;

export type EventPayload<E extends string, P> = {
  event: E;
  payload: P;
};
// Utility type function for converting discriminated union to object type
export type DiscriminatedUnionToObject<U extends EventPayload<any, any>> = {
  [K in U['event']]: Extract<U, { event: K }>['payload'];
};

export class Emitter<T extends object = any> {
  constructor(
    private options: {
      onDestroy?: () => void;
      onEmit?: (message: EventPayload<any, any>) => void;
    } = {},
  ) {}

  /**
   * provides a way to create an emitter with discriminated union types
   */
  static create<U extends EventPayload<string, any>>(options?: {
    onEmit?: (message: U) => void;
    onDestroy?: () => void;
  }) {
    const emitter = new Emitter<DiscriminatedUnionToObject<U>>(options as any);
    return emitter;
  }

  private _callbacks: Listeners = {};

  private destroyed = false;

  destroy(): void {
    this._callbacks = {};
    this.destroyed = true;

    this.options?.onDestroy?.();
  }

  emit<K extends keyof T>(event: K, data: T[K]): this {
    if (this.destroyed) {
      return this;
    }

    const callbacks = this._callbacks[event as string];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }

    const val = {
      event: event as string,
      payload: data,
    } satisfies EventPayload<string, T[K]>;

    this.options?.onEmit?.(val);

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
