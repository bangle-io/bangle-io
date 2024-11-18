import { isPlainObject } from '@bangle.io/mini-js-utils';
import type { AppError } from '@bangle.io/types';

export type AppErrorName = AppError['name'];

type CauseObject = {
  isBangleError: boolean;
  name: AppErrorName;
  payload: Record<string, Error | number | boolean | string | undefined>;
};

export function throwAppError<TError extends AppErrorName>(
  name: TError,
  message: string,
  payload: Extract<AppError, { name: TError }>['payload'],
): never {
  throw new Error(message, {
    cause: {
      isBangleError: true,
      name,
      payload,
    } satisfies CauseObject,
  });
}

export function handleAppError(
  error: Error,
  handler?: (info: AppError, error: Error) => void,
): boolean {
  if (!(error instanceof Error) || !isPlainObject(error.cause)) {
    return false;
  }

  const cause = error.cause as CauseObject;

  if (cause.isBangleError !== true) {
    return false;
  }

  const { name, payload } = cause;

  const info = { name, payload } as AppError;

  handler?.(info, error);

  return true;
}

export function isAppError(error: unknown): boolean {
  if (!(error instanceof Error) || !isPlainObject(error.cause)) {
    return false;
  }

  const cause = error.cause as CauseObject;

  if (cause.isBangleError !== true) {
    return false;
  }

  return true;
}
