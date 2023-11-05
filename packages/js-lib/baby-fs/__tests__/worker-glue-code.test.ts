import { sendToWorkerForWrite } from '../worker-glue-code';

let originalWorker = globalThis.Worker;
let originalCreateObjectURL = globalThis.URL.createObjectURL;

function mockWorker(onMessage: {
  data: {
    done: boolean;
    result: any;
  };
}) {
  return jest.fn(() => {
    let obj: any = {};

    obj.postMessage = jest.fn();
    obj.terminate = jest.fn();

    setTimeout(() => {
      obj.onmessage(onMessage);
    }, 0);

    return obj;
  });
}

beforeEach(() => {
  globalThis.URL.createObjectURL = jest.fn();
});

afterEach(() => {
  globalThis.Worker = originalWorker;
  globalThis.URL.createObjectURL = originalCreateObjectURL;
});

test('works', async () => {
  globalThis.Worker = mockWorker({ data: { done: true, result: 'test' } });
  await sendToWorkerForWrite(async () => 'test', 9);

  expect(globalThis.URL.createObjectURL).toBeCalledTimes(1);
  let blob = jest.mocked(globalThis.URL.createObjectURL).mock.calls?.[0]?.[0];

  expect(blob instanceof Blob ? await blob.text() : null).toEqual(
    `
onmessage=((postMessage) => {
      let work = async ()=>'test';

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
