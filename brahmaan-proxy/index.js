let brahmaan;

class Emitter {
  constructor() {
    Object.defineProperty(this, '_callbacks', {
      enumerable: true,
      configurable: true,
      writable: true,
      value: {},
    });
  }
  on(event, fn) {
    if (!this._callbacks[event]) {
      this._callbacks[event] = [];
    }
    this._callbacks[event].push(fn);
    return this;
  }
  emit(event, data) {
    const callbacks = this._callbacks[event];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
    return this;
  }
  off(event, fn) {
    if (!arguments.length) {
      this._callbacks = {};
    } else {
      const callbacks = this._callbacks ? this._callbacks[event] : null;
      if (callbacks) {
        if (fn) {
          this._callbacks[event] = callbacks.filter((cb) => cb !== fn);
        } else {
          this._callbacks[event] = [];
        }
      }
    }
    return this;
  }
  destroy() {
    this._callbacks = {};
  }
}

const emitter = new Emitter();

export const setBrahmaanReady = (_brahmaan) => {
  brahmaan = _brahmaan;
  emitter.emit('ready');
};

export const brahmaanWorkerProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      if (brahmaan) {
        return Reflect.get(brahmaan, prop);
      }
      return (...args) => {
        return new Promise((res, rej) => {
          const callback = () => {
            try {
              let value = Reflect.apply(
                Reflect.get(brahmaan, prop),
                null,
                args,
              );
              res(value);
              emitter.off('ready', callback);
            } catch (error) {
              rej(error);
              emitter.off('ready', callback);
            }
          };
          emitter.on('ready', callback);
        });
      };
    },
  },
);
