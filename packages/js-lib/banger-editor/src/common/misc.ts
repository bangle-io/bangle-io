// Check if the platform is macOS or iOS

export const isMac =
  typeof navigator !== 'undefined'
    ? /Mac|iP(hone|[oa]d)/.test(navigator.platform)
    : false;

export function assertIsDefined<T>(
  arg: T | null | undefined,
  hint?: string,
): asserts arg is T {
  if (typeof arg === 'undefined' || arg === null || arg === undefined) {
    throw new Error(
      `Assertion Failed: argument is undefined or null. ${hint ?? ''}`,
    );
  }
}
