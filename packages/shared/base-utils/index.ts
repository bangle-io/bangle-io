import type { EventSenderMetadata } from '@bangle.io/types';

export * from './base-service';
export * from './cx';
export * from './github-bug-url';
export * from './misc';
export * from './safe-js';
export * from './throw-app-error';
export * from '@bangle.io/base-error';
export * from '@bangle.io/browser';
export * from '@bangle.io/logger';
export * from '@bangle.io/mini-js-utils';
export * from './base-error-service';
export * from './jotai';

// TODO this is stub
export function getEventSenderMetadata({
  tag,
}: { tag?: undefined | string }): EventSenderMetadata {
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
