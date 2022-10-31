export function savePreviousValue<T>() {
  let prev: T | undefined;

  return (val: T) => {
    const result = prev;
    prev = val;

    return result;
  };
}

// TODO move this to a js lib
export function abortableSetInterval(
  callback: () => void,
  signal: AbortSignal,
  ms: number,
): void {
  const timer = setInterval(callback, ms);

  signal.addEventListener(
    'abort',
    () => {
      clearInterval(timer);
    },
    { once: true },
  );
}
