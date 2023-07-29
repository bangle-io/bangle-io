/**
 * Creates a proxy for a given object that delays method invocations until a certain condition is met.
 * The condition is `isRead.current` being true or false. It returns an object which has a `check` method
 * that can be used to manually invoke the pending method invocations.
 */
export function waitForProxy<
  TTarget extends Record<string, (...args: any[]) => Promise<any>>,
>(
  isReady: { current: boolean },
  targetObject: () => TTarget,
): { proxy: TTarget; check: () => void } {
  const resolveCallbacks: Array<(...args: any[]) => void> = [];

  const proxy = new Proxy<TTarget>({} as any, {
    get: (_, property: string, receiver) => {
      if (isReady.current) {
        const val = Reflect.get(targetObject(), property, receiver);

        if (typeof val !== 'function') {
          console.warn(
            `Proxying on a non-callable ${property} is not supported`,
          );
        }

        return val;
      }

      return function (this: TTarget, ...args: unknown[]) {
        return new Promise((resolve, reject) => {
          const cb = () => {
            const val = Reflect.get(targetObject(), property, receiver);
            try {
              resolve(
                // Make sure functions work with private variables
                // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#no_private_property_forwarding
                Reflect.apply(
                  val,
                  this === receiver ? targetObject() : this,
                  args,
                ),
              );
            } catch (err) {
              reject(err);
            }
          };

          isReady.current ? cb() : resolveCallbacks.push(cb);
        });
      };
    },
  });

  const check = () => {
    if (!isReady.current) {
      return;
    }

    let length = resolveCallbacks.length;

    for (let i = 0; i < length; i++) {
      if (!isReady.current) {
        break;
      }
      const resolveCallback = resolveCallbacks.shift();
      resolveCallback?.();
    }
  };

  return { proxy, check };
}
