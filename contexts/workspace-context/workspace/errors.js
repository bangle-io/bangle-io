class BaseError extends Error {
  /**
   *
   * @param {*} message
   * @param {*} code - error code
   * @param {*} displayMessage - one that will be shown to the user, generally a non fatal error
   * @param {*} srcError - if error encapsulates another error
   */
  constructor(message, code, displayMessage, srcError) {
    // 'Error' breaks prototype chain here
    super(message);
    // restore prototype chain
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }

    if (srcError) {
      console.log('the error occurred while handling this error');
      console.error(srcError);
      this.srcError = srcError;
    }

    if (code) {
      this.code = code;
    }

    this.displayMessage = displayMessage;
    this.name = this.constructor.name;
  }
}

export class FSError extends BaseError {}
export class WorkspaceError extends BaseError {}
