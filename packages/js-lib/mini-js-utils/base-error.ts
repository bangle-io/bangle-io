export class BaseError extends Error {
  code?: string;
  /**
   *
   * @param {*} message
   * @param {*} code - error code
   * @param {*} cause - the cause of the error
   */
  constructor({
    message,
    code,
    cause,
  }: {
    message: string;
    code?: string;
    cause?: unknown;
  }) {
    // 'Error' breaks prototype chain here
    super(message, { cause });

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
  }
}
