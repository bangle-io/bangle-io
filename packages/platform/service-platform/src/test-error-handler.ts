import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';
import { SERVICE_NAME } from '@bangle.io/constants';

export class TestErrorHandlerService extends BaseService2 {
  constructor(context: BaseServiceContext, dependencies: null) {
    super(SERVICE_NAME.testErrorHandlerService, context, dependencies);
  }

  async hookMount(): Promise<void> {}
}
