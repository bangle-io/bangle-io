import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { sendToWorkerForWrite } from '../worker-glue-code';

const originalWorker = globalThis.Worker;
const originalCreateObjectURL = globalThis.URL.createObjectURL;

function mockWorker(onMessage: {
  data: {
    done: boolean;
    result: any;
  };
}) {
  return vi.fn(() => {
    const obj: any = {};

    obj.postMessage = vi.fn();
    obj.terminate = vi.fn();

    setTimeout(() => {
      obj.onmessage(onMessage);
    }, 0);

    return obj;
  });
}

beforeEach(() => {
  globalThis.URL.createObjectURL = vi.fn();
});

afterEach(() => {
  globalThis.Worker = originalWorker;
  globalThis.URL.createObjectURL = originalCreateObjectURL;
});

test('works', async () => {
  globalThis.Worker = mockWorker({ data: { done: true, result: 'test' } });
  await sendToWorkerForWrite(async () => 'test', 9);

  expect(globalThis.URL.createObjectURL).toBeCalledTimes(1);
  const blob = vi.mocked(globalThis.URL.createObjectURL).mock.calls?.[0]?.[0];

  expect(blob instanceof Blob ? await blob.text() : null).toEqual(
    `
onmessage=((postMessage) => {
      let work = async () => "test";

      return ({ data }) => {
        work(data)
          .then((result) => {
            postMessage({ done: true, result: result });
          })
          .catch((error) => {
            console.error(error);
            postMessage({ done: false, errorMessage: error.message });
          });
      };
    })(postMessage)
  `.trim(),
  );
});
