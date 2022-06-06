import { isAbortError } from '@bangle.io/is-abort-error';

import type { AbortControllers } from './util';
import { WORKER_ABORTABLE_SERVICE_ABORTED } from './util';

export type AbortableFunc<R extends any[], X> = (
  abort: AbortSignal,
  ...args: R
) => Promise<X>;
/**
 * ! Must be run in worker thread
 * This method wraps the abortable method and provides it with an AbortSignal
 *
 * @param abortControllers - A place for the method to cache the abort controllers it creates
 * @param abortableFunc - The abortable function to expose to main thread,
 *                       first parameter must be an 'AbortSignal'
 */
export function workerAbortableMethodWrapper(
  abortControllers: AbortControllers,
) {
  return <T extends any[], X>(
      abortableFunc: (abort: AbortSignal, ...args: T) => Promise<X>,
    ) =>
    async (uniqueAbortId: any, ...args: T): Promise<X> => {
      if (typeof uniqueAbortId !== 'string') {
        console.warn(
          'You are probably calling this method incorrectly, please make sure to use the provided prox  y',
        );
        throw new Error('Cannot execute: uniqueAbortId must be string');
      }

      let abortController = abortControllers.get(uniqueAbortId);

      // this is an indication reuse the previous abort controller
      // this happens when the host uses the same signal
      if (!abortController) {
        abortController = new AbortController();
        abortControllers.set(uniqueAbortId, abortController);
      } else {
        console.debug('reusing controller');
      }

      console.debug(uniqueAbortId + ' about to start');

      return abortableFunc(abortController.signal, ...args).then(
        (result) => {
          // if successful cleanup the controller from Map
          abortControllers.delete(uniqueAbortId);
          console.debug(
            uniqueAbortId + ' finished successfully',
            abortController?.signal.aborted,
          );

          return result;
        },
        (error) => {
          // if unsuccessful cleanup the controller from Map
          // if the controller was aborted by called `__abortAnAbortableService`
          // it will be deleted from Map anyway, but if the `abortableFunc`
          // throws error it will not be.
          abortControllers.delete(uniqueAbortId);

          if (isAbortError(error)) {
            console.debug(uniqueAbortId + ' threw Abort Error');
            // if the function aborted with an `AbortError`
            // tell the main thread by returning a unique string
            // which it will check for and throw an AbortError on its end.
            throw WORKER_ABORTABLE_SERVICE_ABORTED;
          }

          throw error;
        },
      );
    };
}
