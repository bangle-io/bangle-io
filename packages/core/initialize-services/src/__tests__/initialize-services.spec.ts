// @vitest-environment jsdom
import { BaseService } from '@bangle.io/base-utils';
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import { createEditorSaveCoordinator } from '@bangle.io/editor';
import { makeTestCommonOpts } from '@bangle.io/test-utils';
import { expect, test, vi } from 'vitest';
import { initializeServices } from '../index';

test('works', () => {
  expect(true).toBe(true);
});
test('initializeServices returns unique service names', async () => {
  const { commonOpts, rootEmitter, controller } = makeTestCommonOpts();

  const services = await initializeServices(
    commonOpts.logger,
    rootEmitter,
    commonOpts.store,
    new ThemeManager(),
    controller.signal,
    createEditorSaveCoordinator(),
    commonOpts.errorReporting,
  );

  const serviceNames = Object.keys(services.core);
  const serviceValues = Object.values(services.core);

  const uniqueServiceNames = new Set(serviceNames);

  expect(uniqueServiceNames.size).toBe(serviceNames.length);

  controller.abort();

  for (const service of serviceValues) {
    if (service instanceof BaseService) {
      expect(service.aborted).toBe(true);
    } else {
      throw new Error('Unexpected service type');
    }
  }
});

test('captures a browser error before React error subscribers mount', async () => {
  const { commonOpts, rootEmitter, controller } = makeTestCommonOpts();
  const error = new Error('private startup failure');

  const servicesPromise = initializeServices(
    commonOpts.logger,
    rootEmitter,
    commonOpts.store,
    new ThemeManager(),
    controller.signal,
    createEditorSaveCoordinator(),
    commonOpts.errorReporting,
  );
  window.dispatchEvent(new ErrorEvent('error', { error }));
  await servicesPromise;

  expect(
    vi.mocked(commonOpts.errorReporting.captureException),
  ).toHaveBeenCalledWith(error);
  controller.abort();
});
