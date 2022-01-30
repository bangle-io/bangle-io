export function savePreviousValue<T>() {
  let prev: T | undefined;

  return (val: T) => {
    const result = prev;
    prev = val;
    return result;
  };
}
