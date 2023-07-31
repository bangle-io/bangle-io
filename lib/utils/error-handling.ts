import { BaseError } from '@bangle.io/base-error';

// Serialize the two types of errors that can be thrown by Bangle.
export function errorSerialize(error: Error | BaseError) {
  let e = error as unknown;

  if (e instanceof BaseError) {
    return { errorType: 'BASE_ERROR' as const, value: e.toJsonValue() };
  } else if (e instanceof Error) {
    return {
      errorType: 'ERROR' as const,
      value: {
        message: e.message,
        name: e.name,
        stack: e.stack,
        thrower: e.thrower,
        code: e.code,
      },
    };
  } else {
    throw new Error('Unknown error type');
  }
}

export function errorParse(
  obj: ReturnType<typeof errorSerialize>,
): Error | BaseError {
  if (obj.errorType === 'ERROR') {
    return Object.assign(new Error(obj.value.message), obj.value);
  } else if (obj.errorType === 'BASE_ERROR') {
    return BaseError.fromJsonValue(obj.value);
  } else {
    throw new Error('Unknown error type');
  }
}
