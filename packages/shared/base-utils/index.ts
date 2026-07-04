import { isPlainObject } from '@bangle.io/mini-js-utils';
import type { EventSenderMetadata } from '@bangle.io/types';
import { BaseService } from './base-service';

/** @public */
export * from '@bangle.io/logger';
/** @public */
export * from '@bangle.io/mini-js-utils';
/** @public */
export * from './base-error-service';
/** @public */
export * from './base-service';
/** @public */
export * from './cx';
/** @public */
export * from './github-bug-url';
/** @public */
export * from './jotai';
/** @public */
export * from './misc';
/** @public */
export * from './safe-js';
/** @public */
export * from './throw-app-error';

// TODO this is stub
/** @public */
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

/** @public */
export function isWorkerGlobalScope() {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-restricted-globals, no-undef
    self instanceof WorkerGlobalScope
  );
}

/** @public */
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
