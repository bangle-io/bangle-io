export type EventListener<T> = (data: T) => void;

export type EventMessage<E extends string, P> = {
  event: E;
  payload: P;
};

type EventPayload<
  U extends EventMessage<string, unknown>,
  E extends U['event'],
> = string extends U['event']
  ? U['payload']
  : Extract<U, { event: E }>['payload'];

export type AllEventListener<U extends EventMessage<string, unknown>> = (
  message: U,
) => void;

type EventListeners<U extends EventMessage<string, unknown>> = {
  [E in U['event']]?: Set<EventListener<EventPayload<U, E>>>;
};

interface EmitterOptions<U extends EventMessage<string, unknown>> {
  paused?: boolean;
  onDestroy?: () => void;
  onEmit?: (message: U) => void;
}

export class Emitter<
  U extends EventMessage<string, unknown> = EventMessage<string, unknown>,
> {
  static create<U extends EventMessage<string, unknown>>(
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
    if (this.destroyed) {
      return;
    }
    this.clearListeners();
    this.destroyed = true;
    this.options?.onDestroy?.();
  }

  emit<E extends U['event']>(event: E, payload: EventPayload<U, E>) {
    if (this.destroyed) {
      return;
    }

    // The event/payload relationship is enforced by EventPayload at the public
    // boundary; TypeScript cannot reconstruct the generic discriminated union.
    const message = { event, payload } as unknown as U;

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
        const message = this.buffer.shift();
        if (message) {
          this.emit(message.event, message.payload);
        }
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
    fn: EventListener<EventPayload<U, E>>,
    signal?: AbortSignal,
  ): () => void {
    if (this.destroyed || signal?.aborted) {
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
      signal?.removeEventListener('abort', cleanup);
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
