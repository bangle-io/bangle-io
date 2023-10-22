export function shallowEqual(
  objA: Record<string, unknown>,
  objB: Record<string, unknown>,
): boolean {
  if (Object.is(objA, objB)) {
    return true;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(objB, key) &&
      Object.is(objA[key], objB[key]),
  );
}
