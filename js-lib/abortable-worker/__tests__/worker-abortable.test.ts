import { WORKER_ABORTABLE_SERVICE_ABORTED } from '../util';
import { workerAbortable } from '../worker-abortable';

let originalConsoleWarn = console.warn;
let originalConsoleDebug = console.debug;
function sleep(t = 20): Promise<void> {
  return new Promise((res) => setTimeout(res, t));
}

describe('workerAbortable', () => {
  beforeEach(() => {
    console.warn = jest.fn();
    console.debug = jest.fn();
  });
  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
  });

  test('throws error if called directly', async () => {
    let abortableMethod = jest.fn(
      async (signal: AbortSignal, count: number) => {
        return count + 1;
      },
    );
    let methods = workerAbortable(({ abortWrapper }) => {
      return {
        abortableMethod: abortWrapper(abortableMethod),
      };
    });
    const controller = new AbortController();

    await expect(
      methods.abortableMethod(controller.signal, 4),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cannot execute: uniqueAbortId must be string"`,
    );
    expect(abortableMethod).toBeCalledTimes(0);
  });

  test('works when called like in a worker', async () => {
    let abortableMethod = jest.fn(
      async (signal: AbortSignal, count: number) => {
        return count + 1;
      },
    );
    let methods = workerAbortable(({ abortWrapper }) => {
      return {
        abortableMethod: abortWrapper(abortableMethod),
      };
    });
    const uid = 'my-uniq-id';
    await expect(methods.abortableMethod(uid as any, 4)).resolves.toBe(5);
    expect(abortableMethod).toBeCalledTimes(1);
    expect(abortableMethod).nthCalledWith(1, expect.any(AbortSignal), 4);
  });

  test('aborts correctly', async () => {
    let abortableMethod = jest.fn(async (signal: AbortSignal) => {
      return new Promise<void>((res, rej) => {
        let timer = setTimeout(() => {
          res();
        }, 500);
        signal.addEventListener(
          'abort',
          () => {
            clearInterval(timer);
            rej(new DOMException('Aborted', 'AbortError'));
          },
          {
            once: true,
          },
        );
      });
    });
    let methods = workerAbortable(({ abortWrapper }) => {
      return {
        abortableMethod: abortWrapper(abortableMethod),
      };
    });
    const uid = 'my-uniq-id';

    let result = methods.abortableMethod(uid as any);

    methods.__signalWorkerToAbortMethod(uid);

    await expect(result).rejects.toBe(WORKER_ABORTABLE_SERVICE_ABORTED);
  });

  test('aborts after method it has resolved', async () => {
    let abortableMethod = jest.fn(async (signal: AbortSignal) => {
      return new Promise<boolean>((res, rej) => {
        let timer = setTimeout(() => {
          res(true);
        }, 0);
        signal.addEventListener(
          'abort',
          () => {
            clearInterval(timer);
            rej(new DOMException('Aborted', 'AbortError'));
          },
          {
            once: true,
          },
        );
      });
    });
    let methods = workerAbortable(({ abortWrapper }) => {
      return {
        abortableMethod: abortWrapper(abortableMethod),
      };
    });
    const uid = 'my-uniq-id';

    let result = methods.abortableMethod(uid as any);
    jest.runAllTimers();

    await sleep(10);

    methods.__signalWorkerToAbortMethod(uid);

    await expect(result).resolves.toBe(true);
    expect(abortableMethod).toBeCalledTimes(1);
    expect(abortableMethod).nthCalledWith(1, expect.any(AbortSignal));
  });

  test('using same abort id on multiple methods', async () => {
    let abortableMethod1 = jest.fn(async (signal: AbortSignal) => {
      return new Promise<boolean>((res, rej) => {
        let timer = setTimeout(() => {
          res(true);
        }, 10);
        signal.addEventListener(
          'abort',
          () => {
            clearInterval(timer);
            rej(new DOMException('Aborted', 'AbortError'));
          },
          { once: true },
        );
      });
    });

    let abortableMethod2 = jest.fn(async (signal: AbortSignal) => {
      return new Promise<boolean>((res, rej) => {
        let timer = setTimeout(() => {
          res(false);
        }, 10);
        signal.addEventListener(
          'abort',
          () => {
            clearInterval(timer);
            rej(new DOMException('Aborted', 'AbortError'));
          },
          {
            once: true,
          },
        );
      });
    });

    let methods = workerAbortable(({ abortWrapper }) => {
      return {
        abortableMethod1: abortWrapper(abortableMethod1),
        abortableMethod2: abortWrapper(abortableMethod2),
      };
    });
    const uid = 'my-uniq-id';

    const result1 = methods.abortableMethod1(uid as any);
    const result2 = methods.abortableMethod2(uid as any);

    methods.__signalWorkerToAbortMethod(uid);

    await expect(result1).rejects.toBe(WORKER_ABORTABLE_SERVICE_ABORTED);
    await expect(result2).rejects.toBe(WORKER_ABORTABLE_SERVICE_ABORTED);
  });
});
