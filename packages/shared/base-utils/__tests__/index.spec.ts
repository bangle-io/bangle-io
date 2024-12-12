import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { BaseServiceCommonOptions } from '@bangle.io/types';
import { describe, expect, test } from 'vitest';
import { BaseService, flatServices } from '../index';

class TestService extends BaseService {
  constructor(baseOptions: BaseServiceCommonOptions) {
    super({
      ...baseOptions,
      name: 'file-system-test',
      kind: 'core',
      dependencies: {},
    });
  }
}

describe('flatServices', () => {
  test('returns empty array for empty object', () => {
    expect(flatServices({})).toEqual([]);
  });

  test('returns single service', () => {
    const { commonOpts } = makeTestCommonOpts();

    const service = new TestService(commonOpts);
    expect(flatServices({ service })).toEqual([service]);
  });

  test('returns nested services', () => {
    const { commonOpts } = makeTestCommonOpts();

    const service1 = new TestService(commonOpts);
    const service2 = new TestService(commonOpts);
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
    const { commonOpts } = makeTestCommonOpts();

    const service = new TestService(commonOpts);
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
