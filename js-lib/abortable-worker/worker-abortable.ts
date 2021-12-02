import { AbortControllers } from './util';
import { workerAbortableMethodWrapper } from './worker-abortable-function-wrapper';

export function workerAbortable<T>(
  cb: ({
    abortWrapper,
  }: {
    abortWrapper: ReturnType<typeof workerAbortableMethodWrapper>;
  }) => T,
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
