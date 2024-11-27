import type { BaseError } from '@bangle.io/base-error';
import type { DiscriminatedEmitter } from '@bangle.io/emitter';

export type ErrorEmitter = DiscriminatedEmitter<
  | {
      event: 'event::browser-error-handler-service:error';
      payload: {
        rejection: boolean;
        error: Error;
      };
    }
  | {
      event: 'event::browser-error-handler-service:app-error';
      payload: {
        rejection: boolean;
        error: BaseError;
        // if true, it means the error wasn't thrown but emitted
        // this can happen in cases where we cannot throw error and stop
        // everything in the middle of the operation.
        isFakeThrow: boolean;
      };
    }
>;
