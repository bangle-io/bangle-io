export type EventListener<T> = (data: T) => void;

type EventListeners = Record<string, Set<EventListener<any>>>;

type AllEventListener<E extends EventMessage<any, any>> = (message: E) => void;

export type DiscriminatedEmitter<U extends EventMessage<any, any>> = Emitter<
  DiscriminatedUnionToObject<U>
>;

export type EventMessage<E extends string, P> = {
  event: E;
  payload: P;
};
// Utility type function for converting discriminated union to object type
type DiscriminatedUnionToObject<U extends EventMessage<any, any>> = {
  [K in U['event']]: Extract<U, { event: K }>['payload'];
};

export type ObjectToDiscriminatedUnion<T extends object> = {
  [K in keyof T]: K extends string ? EventMessage<K, T[K]> : never;
}[keyof T];

interface EmitterOptions {
  paused?: boolean;
  onDestroy?: () => void;
  onEmit?: (message: EventMessage<any, any>) => void;
}

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
  private paused = false;
  private buffer: Array<{ event: keyof T; data: any }> = [];

  constructor(private options: EmitterOptions = {}) {
    if (options?.paused) {
      this.paused = true;
    }
  }

  destroy(): void {
    this.clearListeners();
    this.destroyed = true;
    this.options?.onDestroy?.();
  }

  emit<K extends keyof T>(event: K, data: T[K]) {
    if (this.destroyed) {
      return;
    }

    if (this.paused) {
      this.buffer.push({ event, data });
      return;
    }

    const callbacks = this._eventListeners[event as string];
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }

    const val = {
      event: event as string,
      payload: data,
    } satisfies EventMessage<string, T[K]>;

    for (const callback of this._allEventListeners) {
      callback(val);
    }

    return;
  }

  pause(): this {
    if (!this.destroyed) {
      this.paused = true;
    }
    return this;
  }

  unpause(): this {
    if (!this.destroyed) {
      // Unpause before processing the buffer
      this.paused = false;
      while (this.buffer.length > 0) {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        const { event, data } = this.buffer.shift()!;
        this.emit(event, data);
      }

      this.paused = false;
    }
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

  on<K extends keyof T>(
    event: K,
    fn: EventListener<T[K]>,
    signal?: AbortSignal,
  ): () => void {
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

    const cleanup = () => {
      existing?.delete(fn);
    };

    signal?.addEventListener('abort', cleanup, { once: true });

    return cleanup;
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

  readOnly<const K extends keyof T>(_events: K[]): ReadOnlyEmitter<Pick<T, K>> {
    return this as unknown as ReadOnlyEmitter<T>;
  }

  writeOnly<const K extends keyof T>(
    _events: K[],
  ): WriteOnlyEmitter<Pick<T, K>> {
    return this as unknown as WriteOnlyEmitter<T>;
  }
}

export type ReadOnlyEmitter<T extends object = any> = {
  on<K extends keyof T>(
    event: K,
    fn: EventListener<T[K]>,
    signal?: AbortSignal,
  ): void;
};

export type WriteOnlyEmitter<T extends object = any> = {
  emit<K extends keyof T>(event: K, data: T[K]): void;
};
