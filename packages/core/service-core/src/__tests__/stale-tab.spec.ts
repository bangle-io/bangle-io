import { getEventSenderMetadata } from '@bangle.io/base-utils';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { describe, expect, it } from 'vitest';

describe('stale tab signal', () => {
  it('flips workbench $staleTab when the stale-tab event fires', async () => {
    const controller = new AbortController();
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    expect(testEnv.store.get(services.workbenchState.$staleTab)).toBe(false);

    testEnv.rootEmitter.emit('event::app:stale-tab', {
      sender: getEventSenderMetadata({ tag: 'test' }),
    });

    expect(testEnv.store.get(services.workbenchState.$staleTab)).toBe(true);
    controller.abort();
  });
});
