import { isPlainObject } from '@bangle.io/mini-js-utils';
import type { EventSenderMetadata } from '@bangle.io/types';
import { BaseService } from './base-service';

export * from '@bangle.io/logger';
export * from '@bangle.io/mini-js-utils';
export * from './base-error-service';
export * from './base-service';
export * from './cx';
export * from './github-bug-url';
export * from './jotai';
export * from './misc';
export * from './safe-js';
export * from './throw-app-error';

// TODO this is stub
export function getEventSenderMetadata({
  tag,
}: {
  tag?: undefined | string;
}): EventSenderMetadata {
  return {
    id: 'bangle-app',
    tag: tag,
  };
}

export function isWorkerGlobalScope() {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  );
}

export function flatServices(services: Record<string, unknown>): BaseService[] {
  return Object.values(services).flatMap((service): BaseService[] => {
    if (service instanceof BaseService) {
      return [service];
    }

    if (isPlainObject(service)) {
      return flatServices(service as Record<string, unknown>);
    }

    return [];
  });
}
