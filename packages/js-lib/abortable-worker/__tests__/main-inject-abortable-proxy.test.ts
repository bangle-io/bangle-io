import { mainInjectAbortableProxy } from '../main-inject-abortable-proxy';
import { workerAbortable } from '../worker-abortable';

let originalConsoleWarn = console.warn;
let originalConsoleDebug = console.debug;

describe('abortable worker', () => {
  beforeEach(() => {
    console.warn = jest.fn();
    console.debug = jest.fn();
  });
  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.debug = originalConsoleDebug;
  });

  test('sets up correctly', async () => {
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

    let proxiedMethods = mainInjectAbortableProxy(methods);
    const controller = new AbortController();

    expect(await proxiedMethods.abortableMethod(controller.signal, 4)).toBe(5);
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

    let proxiedMethods = mainInjectAbortableProxy(
      workerAbortable(({ abortWrapper }) => {
        return {
          abortableMethod: abortWrapper(abortableMethod),
        };
      }),
    );

    const controller = new AbortController();

    let result = proxiedMethods.abortableMethod(controller.signal);

    controller.abort();

    await expect(result).rejects.toMatchInlineSnapshot(`DOMException {}`);
  });

  test('doesnt touch methods that donot start with abortable', async () => {
    let otherMethod = jest.fn(async (count: number) => {
      return new Promise<number>((res, rej) => {
        setTimeout(() => {
          res(count);
        }, 500);
      });
    });

    let proxiedMethods = mainInjectAbortableProxy(
      workerAbortable(({ abortWrapper }) => {
        return {
          otherMethod,
        };
      }),
    );

    jest.runAllTimers();

    let result = await proxiedMethods.otherMethod(12);

    expect(result).toBe(12);
  });
});
