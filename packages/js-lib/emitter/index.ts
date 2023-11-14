type EventListener<T> = (data: T) => void;

type EventListeners = Record<string, Set<EventListener<any>>>;

type AllEventListener<E extends EventMessage<any, any>> = (message: E) => void;

export type EventMessage<E extends string, P> = {
  event: E;
  payload: P;
};
// Utility type function for converting discriminated union to object type
export type DiscriminatedUnionToObject<U extends EventMessage<any, any>> = {
  [K in U['event']]: Extract<U, { event: K }>['payload'];
};

export type ObjectToDiscriminatedUnion<T extends object> = {
  [K in keyof T]: K extends string ? EventMessage<K, T[K]> : never;
}[keyof T];

export class Emitter<T extends object = any> {
  /**
   * provides a way to create an emitter with discriminated union types
   */
  static create<U extends EventMessage<string, any>>(options?: {
    onEmit?: (message: U) => void;
    onDestroy?: () => void;
  }) {
    const emitter = new Emitter<DiscriminatedUnionToObject<U>>(options as any);
    return emitter;
  }

  public _eventListeners: EventListeners = {};
  public _allEventListeners = new Set<AllEventListener<any>>();
  private destroyed = false;

  constructor(
    private options: {
      onDestroy?: () => void;
      onEmit?: (message: EventMessage<any, any>) => void;
    } = {},
  ) {}

  destroy(): void {
    this.clearListeners();
    this.destroyed = true;
    this.options?.onDestroy?.();
  }

  emit<K extends keyof T>(event: K, data: T[K]): this {
    if (this.destroyed) {
      return this;
    }

    const callbacks = this._eventListeners[event as string];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }

    const val = {
      event: event as string,
      payload: data,
    } satisfies EventMessage<string, T[K]>;

    this._allEventListeners.forEach((callback) => callback(val));

    return this;
  }

  clearListeners(): this {
    if (this.destroyed) {
      return this;
    }

    this._eventListeners = {};
    this._allEventListeners.clear();
    return this;
  }

  on<K extends keyof T>(event: K, fn: EventListener<T[K]>): () => void {
    if (this.destroyed) {
      return () => undefined;
    }

    const eventKey = event as string;
    let existing = this._eventListeners[eventKey];

    if (!existing) {
      existing = new Set();
      this._eventListeners[eventKey] = existing;
    }

    existing.add(fn);
    return () => {
      existing?.delete(fn);
    };
  }

  onAll(fn: AllEventListener<ObjectToDiscriminatedUnion<T>>): () => void {
    if (this.destroyed) {
      return () => undefined;
    }

    this._allEventListeners.add(fn);
    return () => {
      this._allEventListeners.delete(fn);
    };
  }
}
