import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { describe, expect, test } from 'vitest';
import { BaseService, type BaseServiceContext, flatServices } from '../index';

class TestService extends BaseService {
  constructor(
    context: BaseServiceContext,
    private dependencies: null,
  ) {
    super('file-system-test', context, null);
  }

  hookMount() {
    // noop
  }
}

describe('flatServices', () => {
  test('returns empty array for empty object', () => {
    expect(flatServices({})).toEqual([]);
  });

  test('returns single service', () => {
    const { testServiceContext } = makeTestCommonOpts();

    const service = new TestService(testServiceContext, null);
    expect(flatServices({ service })).toEqual([service]);
  });

  test('returns nested services', () => {
    const { testServiceContext } = makeTestCommonOpts();

    const service1 = new TestService(testServiceContext, null);
    const service2 = new TestService(testServiceContext, null);
    const services = {
      group1: {
        service1,
      },
      group2: {
        service2,
      },
    };

    expect(flatServices(services)).toEqual([service1, service2]);
  });

  test('ignores non-service values', () => {
    const { testServiceContext } = makeTestCommonOpts();

    const service = new TestService(testServiceContext, null);
    const services = {
      service,
      notService: 'hello',
      nested: {
        alsoNotService: 42,
      },
    };

    expect(flatServices(services)).toEqual([service]);
  });
});
