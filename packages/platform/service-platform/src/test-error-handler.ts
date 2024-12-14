import { BaseService2, type BaseServiceContext } from '@bangle.io/base-utils';

export class TestErrorHandlerService extends BaseService2 {
  constructor(context: BaseServiceContext, dependencies: null) {
    super('test-error-handler', context, dependencies);
  }

  async hookMount(): Promise<void> {}
}
