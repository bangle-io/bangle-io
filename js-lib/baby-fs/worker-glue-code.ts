export async function sendToWorkerForWrite<T, R extends Promise<any>>(
  code: (arg: T) => R,
  data: T,
): Promise<Awaited<R>> {
  return compute(
    `((postMessage) => {
      let work = ${code.toString()};

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
    })`,
    data,
  ) as any;
}

async function compute(
  workerCode: string,
  message: any,
  transfer: Transferable[] = [],
) {
  let blob = new Blob([`onmessage=${workerCode}(postMessage)`], {
    type: 'text/javascript',
  });
  let worker = new Worker(URL.createObjectURL(blob));

  const prom = new Promise((resolve, reject) => {
    worker.postMessage(message, transfer);
    worker.onmessage = ({ data }) => {
      worker.terminate();

      if (data.done) {
        resolve(data);
      } else {
        reject(
          new Error(
            data.errorMessage || 'Invalid error message returned by worker',
          ),
        );
      }
    };
    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };
  });

  let timer: ReturnType<typeof setTimeout> | null = null;

  prom.then(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });

  return Promise.race([
    prom,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        console.warn('sendToWorkerForWrite worker timed out');
        reject(new Error('sendToWorkerForWrite worker timed out'));
        worker.terminate();
      }, 5000);
    }),
  ]);
}
