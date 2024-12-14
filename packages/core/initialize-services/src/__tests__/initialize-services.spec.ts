// @vitest-environment jsdom
import { BaseService, BaseService2, type Logger } from '@bangle.io/base-utils';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { Emitter } from '@bangle.io/emitter';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import type { RootEmitter, Store } from '@bangle.io/types';
import { expect, test } from 'vitest';
import { initializeServices } from '../index';

test('works', () => {
  expect(true).toBe(true);
});
test('initializeServices returns unique service names', () => {
  const { commonOpts, rootEmitter, controller } = makeTestCommonOpts();

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

  controller.abort();

  for (const service of serviceValues) {
    if (service instanceof BaseService2) {
      expect(service.aborted).toBe(true);
    } else {
      for (const s of Object.values(service)) {
        if (s instanceof BaseService2) {
          expect(s.aborted).toBe(true);
        } else {
          throw new Error('Unexpected service type');
        }
      }
    }
  }
});
