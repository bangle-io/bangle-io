import type { AbortControllers } from './util';
import type { AbortableFunc } from './worker-abortable-function-wrapper';
import { workerAbortableMethodWrapper } from './worker-abortable-function-wrapper';

type Callback<T> = ({
  abortWrapper,
}: {
  abortWrapper: <R extends any[], X>(
    abortableFunc: AbortableFunc<R, X>,
    // the return part is a lie
    // because we actually wrap the function to take the first parameter
    // as a string (this is what allows from cross thread abortion), but since
    //  we want to keep the types same as we expect the user to use proxy for accessing the function
  ) => AbortableFunc<R, X>;
}) => T;

export function workerAbortable<T extends { [key: string]: any }>(
  cb: Callback<T>,
) {
  let abortControllers: AbortControllers = new Map();

  return workerAbortHandler(
    cb({
      abortWrapper: workerAbortableMethodWrapper(abortControllers),
    }),
    abortControllers,
  );
}

export function workerAbortHandler<T extends { [key: string]: any }>(
  workerMethods: T,
  abortControllers: AbortControllers,
) {
  return {
    ...workerMethods,
    __signalWorkerToAbortMethod: async (uniqueAbortId: string) => {
      const abort = abortControllers.get(uniqueAbortId);

      if (abort) {
        console.debug('aborted' + uniqueAbortId);
        abort.abort();
        abortControllers.delete(uniqueAbortId);
      } else {
        console.debug(`Cannot abort: ${uniqueAbortId} not found`);
      }
    },
  };
}
