import { BaseError } from '@bangle.io/base-error';
import { isPlainObject } from '@bangle.io/mini-js-utils';
import type { AppError } from '@bangle.io/types';

export type AppErrorName = AppError['name'];

type CauseObject = {
  isBangleAppError: boolean;
  name: AppErrorName;
  payload: Record<string, Error | number | boolean | string | undefined>;
};

export function throwAppError<TError extends AppErrorName>(
  name: TError,
  message: string,
  payload: Extract<AppError, { name: TError }>['payload'],
): never {
  throw new BaseError({
    message,
    cause: {
      isBangleAppError: true,
      name,
      payload,
    } satisfies CauseObject,
  });
}

export function getAppErrorCause(error: BaseError): AppError | null {
  if (!(error instanceof BaseError) || !isPlainObject(error.cause)) {
    return null;
  }

  const cause = error.cause as CauseObject;

  if (cause.isBangleAppError !== true) {
    return null;
  }

  return { name: cause.name, payload: cause.payload } as AppError;
}

export function handleAppError(
  error: Error,
  handler?: (info: AppError, error: Error) => void,
): boolean {
  if (!(error instanceof BaseError) || !isPlainObject(error.cause)) {
    return false;
  }

  const cause = error.cause as CauseObject;

  if (cause.isBangleAppError !== true) {
    return false;
  }

  const { name, payload } = cause;

  const info = { name, payload } as AppError;

  handler?.(info, error);

  return true;
}

export function isAppError(error: unknown): error is BaseError {
  if (!(error instanceof BaseError) || !isPlainObject(error.cause)) {
    return false;
  }

  const cause = error.cause as CauseObject;

  if (cause.isBangleAppError !== true) {
    return false;
  }

  return true;
}

export async function handleAsyncAppError<T>(
  promise: Promise<T>,
  fallbackValue: (appError: AppError) => NoInfer<T>,
) {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof BaseError) {
      const appError = getAppErrorCause(error);
      if (appError) {
        return fallbackValue(appError);
      }
    }
    throw error;
  }
}
