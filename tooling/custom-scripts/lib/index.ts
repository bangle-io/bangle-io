export function makeThrowValidationError(
  prefix: string,
): (message: string) => never {
  return (message) => {
    throw new Error(`${prefix}: ${message}`);
  };
}
