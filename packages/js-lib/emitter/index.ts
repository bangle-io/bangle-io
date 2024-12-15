export type EventListener<T> = (data: T) => void;

export type EventMessage<E extends string, P> = {
  event: E;
  payload: P;
};

export type AllEventListener<U extends EventMessage<any, any>> = (
  message: U,
) => void;

type EventListeners<U extends EventMessage<any, any>> = {
  [E in U['event']]?: Set<EventListener<Extract<U, { event: E }>['payload']>>;
};

interface EmitterOptions<U extends EventMessage<any, any>> {
  paused?: boolean;
  onDestroy?: () => void;
  onEmit?: (message: U) => void;
}

export class Emitter<
  U extends EventMessage<any, any> = EventMessage<any, unknown>,
> {
  static create<U extends EventMessage<string, any>>(
    options?: EmitterOptions<U>,
  ) {
    return new Emitter<U>(options);
  }

  private _eventListeners: EventListeners<U> = {};
  private _allEventListeners = new Set<AllEventListener<U>>();
  private destroyed = false;
  private paused = false;
  private buffer: U[] = [];

  constructor(private options: EmitterOptions<U> = {}) {
    if (options?.paused) {
      this.paused = true;
    }
  }

  destroy(): void {
    this.clearListeners();
    this.destroyed = true;
    this.options?.onDestroy?.();
  }

  emit<E extends U['event']>(
    event: E,
    payload: Extract<U, { event: E }>['payload'],
  ) {
    console.log('emit', event, payload);
    if (this.destroyed) {
      return;
    }

    const message = { event, payload: payload } as U;

    if (this.paused) {
      this.buffer.push(message);
      return;
    }

    const callbacks = this._eventListeners[event];
    if (callbacks) {
      for (const callback of callbacks) {
        callback(payload);
      }
    }

    for (const callback of this._allEventListeners) {
      callback(message);
    }

    this.options.onEmit?.(message);
  }

  pause(): this {
    if (!this.destroyed) {
      this.paused = true;
    }
    return this;
  }

  unpause(): this {
    if (!this.destroyed) {
      this.paused = false;
      while (this.buffer.length > 0) {
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        const message = this.buffer.shift()!;
        this.emit(message.event, message.payload);
      }
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

  on<E extends U['event']>(
    event: E,
    fn: EventListener<Extract<U, { event: E }>['payload']>,
    signal?: AbortSignal,
  ): () => void {
    if (this.destroyed) {
      return () => undefined;
    }

    let existing = this._eventListeners[event];

    if (!existing) {
      existing = new Set();
      this._eventListeners[event] = existing;
    }

    existing.add(fn);

    const cleanup = () => {
      existing?.delete(fn);
    };

    signal?.addEventListener('abort', cleanup, { once: true });

    return cleanup;
  }

  onAll(fn: AllEventListener<U>): () => void {
    if (this.destroyed) {
      return () => undefined;
    }

    this._allEventListeners.add(fn);
    return () => {
      this._allEventListeners.delete(fn);
    };
  }
}
