import { AbortControllers } from './util';
import {
  AbortableFunc,
  workerAbortableMethodWrapper,
} from './worker-abortable-function-wrapper';

type Callback<T> = ({
  abortWrapper,
}: {
  abortWrapper: <R extends any[], X>(
    abortableFunc: AbortableFunc<R, X>,
    // the return part is a lie
    // because we wrap the function to take the first parameter
    // as a string, but we want to keep to the types same
    // as we expect the user to use proxy for accessing the function
  ) => AbortableFunc<R, X>;
}) => T;

export function workerAbortable<T>(cb: Callback<T>) {
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
    __signalWorkerToAbort: (uniqueAbortId: string) => {
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
