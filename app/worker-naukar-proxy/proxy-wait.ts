import type { Emitter } from '@bangle.io/utils';

export type ProxyRef<T> = { current: T | undefined };
export const READY = 'ready';
/**
 * Creates a proxy for a given object that delays method invocations until a certain condition is met.
 * When the condition is met, the `READY` event MUST be emitted on the `emitter`.
 * The condition is checked by the `getValue` function: it should return the object when the condition is met,
 * or `undefined` otherwise. Once this event is received, any pending method invocations are carried out, and subsequent method calls
 * on the proxy are forwarded directly to the actual object.
 */
export function waitProxy<T extends object>(
  getValue: () => T | undefined,
  emitter: Emitter,
): T {
  let result = getValue();

  return new Proxy<T>({} as any, {
    get(_target, prop) {
      result = result ?? getValue();

      if (result !== undefined) {
        return Reflect.get(result, prop);
      }

      return (...args: any[]) => {
        return new Promise((res, rej) => {
          const callback = () => {
            emitter.off(READY, callback);
            try {
              result = getValue();

              if (result === undefined) {
                throw new Error('Value marked ready but not found');
              }
              // currently only supports callable

              let value = Reflect.apply(
                Reflect.get(result, prop) as any,
                null,
                args,
              );
              res(value);
            } catch (error) {
              rej(error);
            }
          };
          emitter.on(READY, callback);
        });
      };
    },
  });
}
