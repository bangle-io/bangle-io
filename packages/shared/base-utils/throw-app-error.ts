import {
  BaseError,
  isAbortError,
  isPlainObject,
} from '@bangle.io/mini-js-utils';
import type { AppError } from '@bangle.io/types';

export type AppErrorName = AppError['name'];

type CauseObject = {
  isBangleAppError: boolean;
  name: AppErrorName;
  payload: Record<string, Error | number | boolean | string | undefined>;
};

function getCauseObject(error: unknown): CauseObject | null {
  if (!(error instanceof BaseError) || !isPlainObject(error.cause)) {
    return null;
  }

  const cause = error.cause as CauseObject;

  if (!cause.isBangleAppError) {
    return null;
  }

  return cause;
}

export function createAppError<TError extends AppErrorName>(
  name: TError,
  message: string,
  payload: Extract<AppError, { name: TError }>['payload'],
): BaseError {
  return new BaseError({
    message,
    cause: {
      isBangleAppError: true,
      name,
      payload,
    } satisfies CauseObject,
  });
}

export function throwAppError<TError extends AppErrorName>(
  name: TError,
  message: string,
  payload: Extract<AppError, { name: TError }>['payload'],
): never {
  throw createAppError<TError>(
    name,
    message,
    // @ts-expect-error ts being ts
    payload,
  );
}

export function getAppErrorCause(error: BaseError): AppError | null {
  const cause = getCauseObject(error);
  if (!cause) {
    return null;
  }

  return { name: cause.name, payload: cause.payload } as AppError;
}

export function handleAppError(
  error: Error,
  handler?: (info: AppError, error: Error) => void,
): boolean {
  const cause = getCauseObject(error);
  if (!cause) {
    return false;
  }

  const info = { name: cause.name, payload: cause.payload } as AppError;
  handler?.(info, error);
  return true;
}

export function isAppError(error: unknown): error is BaseError {
  return getCauseObject(error) !== null;
}

export async function wrapPromiseInAppErrorHandler<T>(
  promise: Promise<T>,
  fallbackValue: NoInfer<T>,
  emitAppErrorFn: (error: BaseError) => void,
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (isAbortError(error)) {
      return fallbackValue;
    }
    if (error instanceof Error) {
      const appError = getAppErrorCause(error as BaseError);
      if (appError) {
        emitAppErrorFn(error);
        return fallbackValue;
      }
    }
    throw error;
  }
}
