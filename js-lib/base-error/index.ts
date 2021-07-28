export class BaseError extends Error {
  srcError?: Error | null;
  displayMessage?: string | null;
  code?: string | null;
  /**
   *
   * @param {*} message
   * @param {*} code - error code
   * @param {*} displayMessage - one that will be shown to the user, generally a non fatal error
   * @param {*} srcError - if error encapsulates another error
   */
  constructor(
    message: string,
    code: string | null = null,
    displayMessage: string | null = null,
    srcError: Error | null = null,
  ) {
    if (code != null) {
      message = code + ':' + message;
    }
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

    if (srcError) {
      this.srcError = srcError;
    }

    if (code) {
      this.code = code;
    }

    this.displayMessage = displayMessage;

    this.name = this.constructor.name;
  }
}
