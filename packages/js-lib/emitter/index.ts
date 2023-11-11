type Listeners<T> = Record<string, Listener<T>[]>;
type Listener<T = any> = (data: T) => void;

export class Emitter<T = any> {
  _callbacks: Listeners<T> = {};

  // If fn is not provided, all event listeners for that event will be removed.
  destroy() {
    this._callbacks = {};
  }

  emit(event: any, data: T) {
    const callbacks = this._callbacks[event];

    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }

    return this;
  }

  // If neither is provided, all event listeners will be removed.
  off(event?: string, fn?: Listener<T>) {
    if (!arguments.length) {
      this._callbacks = {};
    } else {
      // event listeners for the given event
      const callbacks = this._callbacks ? this._callbacks[event!] : null;
      if (callbacks) {
        if (fn) {
          this._callbacks[event!] = callbacks.filter((cb) => cb !== fn);
        } else {
          this._callbacks[event!] = []; // remove all handlers
        }
      }
    }

    return this;
  }

  // Add an event listener for given event
  on(event: any, fn: any) {
    // Create namespace for this event
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }
    this._callbacks[event]!.push(fn);
    return this;
  }

  // Remove event listener for given event.
}
