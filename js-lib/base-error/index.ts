export class BaseError extends Error {
  static fromJsonValue(input: ReturnType<BaseError['toJsonValue']>) {
    const error = new BaseError({
      message: input.message,
      code: input.code || undefined,
      thrower: input.thrower || undefined,
    });

    error.name = input.name;

    if (input.stack) {
      error.stack = input.stack;
    }

    return error;
  }

  code?: string;
  thrower?: string;
  /**
   *
   * @param {*} message
   * @param {*} code - error code
   * @param {*} thrower - the name of the function that threw the error,
   *                       useful for enforcing boundaries for extensions.
   */
  constructor({
    message,
    code,
    thrower,
  }: {
    message: string;
    code?: string;
    thrower?: string;
  }) {
    // 'Error' breaks prototype chain here
    super(message);

    // Error.captureStackTrace is a v8-specific method so not avilable on
    // Firefox or Safari
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, BaseError);
    } else {
      const stack = new Error().stack;

      if (stack) {
        this.stack = stack;
      }
    }

    // restore prototype chain
    const actualProto = new.target.prototype;

    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      (this as any).__proto__ = actualProto;
    }

    this.name = this.constructor.name;

    if (code) {
      this.code = code;
    }
    this.thrower = thrower;
  }

  toJsonValue() {
    let message = this.message;

    let name = this.name;

    return {
      name,
      message,
      thrower: this.thrower,
      code: this.code || null,
      stack: this.stack,
    };
  }
}
