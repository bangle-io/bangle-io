export class BaseError extends Error {
  code?: string;
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

    // Error.captureStackTrace is a V8-specific method, so it is not available on
    // Firefox or Safari
    const errorConstructor = Error as ErrorConstructor & {
      captureStackTrace?: (target: object, constructorOption?: object) => void;
    };
    if (errorConstructor.captureStackTrace) {
      errorConstructor.captureStackTrace(this, BaseError);
    } else {
      const stack = new Error().stack;

      if (stack) {
        this.stack = stack;
      }
    }

    // restore prototype chain
    const actualProto = new.target.prototype;

    Object.setPrototypeOf(this, actualProto);

    this.name = this.constructor.name;

    if (code) {
      this.code = code;
    }
  }
}
