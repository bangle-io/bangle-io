export type Mapper<Element, NewElement> = (
  element: Element,
  index: number,
) => NewElement | Promise<NewElement>;

// this will stop on first error
export async function pMap<Element, NewElement>(
  iterable: Iterable<Element>,
  mapper: Mapper<Element, NewElement>,
  {
    concurrency = Number.POSITIVE_INFINITY,
    abortSignal,
  }: { concurrency?: number; abortSignal: AbortSignal },
): Promise<NewElement[]> {
  assertSignal(abortSignal);

  return new Promise((resolve, reject) => {
    if (typeof mapper !== 'function') {
      throw new TypeError('Mapper function is required');
    }
    if (
      !(
        (Number.isSafeInteger(concurrency) ||
          concurrency === Number.POSITIVE_INFINITY) &&
        concurrency >= 1
      )
    ) {
      throw new TypeError(
        `Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`,
      );
    }
    assertSignal(abortSignal);

    const result: NewElement[] = [];
    const iterator = iterable[Symbol.iterator]();
    let isRejected = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;
    let destroyed = false;
    abortSignal.addEventListener(
      'abort',
      (e) => {
        destroyed = true;
        reject(new DOMException('Aborted', 'AbortError'));
      },
      {
        once: true,
      },
    );

    const next = () => {
      if (isRejected || destroyed) {
        return;
      }

      const nextItem = iterator.next();
      const index = currentIndex;
      currentIndex++;

      if (nextItem.done) {
        isIterableDone = true;

        if (resolvingCount === 0) {
          resolve(result);
        }

        return;
      }

      resolvingCount++;

      (async () => {
        try {
          const element = await nextItem.value;
          result[index] = await mapper(element, index);
          resolvingCount--;
          next();
        } catch (error) {
          isRejected = true;
          reject(error);
        }
      })();
    };

    for (let index = 0; index < concurrency; index++) {
      next();

      if (isIterableDone) {
        break;
      }
    }
  });
}

export function assertSignal(signal: AbortSignal) {
  if (signal.aborted) {
    throw new DOMException('AbortError', 'AbortError');
  }
}
