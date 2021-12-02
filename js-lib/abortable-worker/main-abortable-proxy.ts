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
  T extends { __signalWorkerToAbort: (uid: string) => void },
>(
  workerProxiedMethods: T,
  {
    abortableMethodIdentifier = 'abortable',
  }: {
    abortableMethodIdentifier?: string;
  } = {},
) {
  return new Proxy(workerProxiedMethods, {
    get(_target, prop) {
      if (
        typeof prop === 'string' &&
        prop.startsWith(abortableMethodIdentifier)
      ) {
        return (abortSignal, ...args) => {
          if (!(abortSignal instanceof AbortSignal)) {
            throw new Error(
              `An abortable methods (${prop}) first param must be an "AbortSignal"`,
            );
          }

          assertSignal(abortSignal);

          const uid = prop + objectUid(abortSignal);

          abortSignal.addEventListener('abort', () => {
            console.debug('aborting ' + uid);
            _target.__signalWorkerToAbort(uid);
          });

          return Reflect.apply(Reflect.get(_target, prop), null, [
            uid,
            ...args,
          ]).catch((error) => {
            if (error === WORKER_ABORTABLE_SERVICE_ABORTED) {
              throw new DOMException('Aborted', 'AbortError');
            }
            throw error;
          });
        };
      }
      return Reflect.get(_target, prop);
    },
  });
}
