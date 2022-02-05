import * as Comlink from 'comlink';

import { BaseError } from '@bangle.io/base-error';

Comlink.transferHandlers.set('BaseError', {
  canHandle: (obj: any): obj is BaseError => obj instanceof BaseError,
  serialize: (base: BaseError) => {
    return [base.toJsonValue(), []];
  },
  deserialize: (obj: any) => {
    return BaseError.fromJsonValue(obj);
  },
});
