// @vitest-environment jsdom
import type { Logger } from '@bangle.io/base-utils';
import { Emitter } from '@bangle.io/emitter';
import { makeTestService } from '@bangle.io/test-utils';
import type { ErrorEmitter, Store } from '@bangle.io/types';
import { expect, test } from 'vitest';
import { initializeServices } from '../initialize-services';

test('works', () => {
  expect(true).toBe(true);
});
test('initializeServices returns unique service names', () => {
  const { commonOpts } = makeTestService();
  const errorEmitter: ErrorEmitter = new Emitter();

  const services = initializeServices(
    commonOpts.logger,
    errorEmitter,
    commonOpts.store,
  );

  const serviceNames = [
    ...Object.keys(services.core),
    ...Object.keys(services.platform),
  ];

  const serviceValues = [
    ...Object.values(services.core),
    ...Object.values(services.platform),
  ];

  const uniqueServiceNames = new Set(serviceNames);

  expect(uniqueServiceNames.size).toBe(serviceNames.length);

  for (const service of serviceValues) {
    service.dispose();
  }
});
