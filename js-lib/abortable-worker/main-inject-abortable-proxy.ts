import { objectUid } from '@bangle.io/object-uid';

import { assertSignal } from './assert-signal';
import { WORKER_ABORTABLE_SERVICE_ABORTED } from './util';

/**
 * !Must be run in main thread
 *
 * Inject the glue for allowing main thread to call worker methods
 * with abort. By default only intercepts methods with name starting
 * with `abortable`, these methods definitions must have their first
 * parameter as `AbortSignal`.
 *
 * @param workerProxiedMethods - comlink proxied worker methods
 * @param param1
 * @returns
 */
export function mainInjectAbortableProxy<
  T extends { __signalWorkerToAbortMethod: (uid: string) => void },
>(
  workerProxiedMethods: T,
  {
    abortableMethodIdentifier = 'abortable',
  }: {
    abortableMethodIdentifier?: string;
  } = {},
): T {
  return new Proxy(workerProxiedMethods, {
    get(_target, prop) {
      const method = Reflect.get(_target, prop);

      if (
        typeof prop === 'string' &&
        prop.startsWith(abortableMethodIdentifier) &&
        typeof method === 'function'
      ) {
        return (abortSignal: unknown, ...args: unknown[]) => {
          if (!(abortSignal instanceof AbortSignal)) {
            throw new Error(
              `An abortable methods (${prop}) first param must be an "AbortSignal"`,
            );
          }

          assertSignal(abortSignal);

          const uid = prop + objectUid(abortSignal);

          abortSignal.addEventListener(
            'abort',
            () => {
              console.debug('aborting ' + uid);
              _target.__signalWorkerToAbortMethod(uid);
            },
            { once: true },
          );

          return Reflect.apply(method, null, [uid, ...args]).catch(
            (error: unknown) => {
              if (error === WORKER_ABORTABLE_SERVICE_ABORTED) {
                throw new DOMException('Aborted', 'AbortError');
              }
              throw error;
            },
          );
        };
      }

      return method;
    },
  });
}
