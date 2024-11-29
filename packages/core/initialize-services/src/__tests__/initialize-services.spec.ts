// @vitest-environment jsdom
import { BaseService, type Logger } from '@bangle.io/base-utils';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { Emitter } from '@bangle.io/emitter';
import { makeTestService } from '@bangle.io/test-utils';
import type { RootEmitter, Store } from '@bangle.io/types';
import { expect, test } from 'vitest';
import { initializeServices } from '../initialize-services';

test('works', () => {
  expect(true).toBe(true);
});
test('initializeServices returns unique service names', () => {
  const { commonOpts, rootEmitter, controller } = makeTestService();

  const services = initializeServices(
    commonOpts.logger,
    rootEmitter,
    commonOpts.store,
    new ThemeManager(),
    controller.signal,
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
    if (service instanceof BaseService) {
      service.dispose();
    } else {
      for (const s of Object.values(service)) {
        s?.dispose();
      }
    }
  }
});
