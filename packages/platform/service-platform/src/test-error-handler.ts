import { BaseErrorService } from '@bangle.io/base-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';

export class TestErrorHandlerService extends BaseErrorService {
  constructor(baseOptions: BaseServiceCommonOptions, dependencies: undefined) {
    super({
      ...baseOptions,
      name: 'test-error-handler',
      kind: 'platform',
      dependencies,
    });
  }
}
