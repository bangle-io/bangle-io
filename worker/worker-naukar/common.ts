import type { ExtensionRegistry } from '@bangle.io/shared-types';

import type { DocChangeEmitter } from './doc-change-emitter';

export const DOC_WRITE_DEBOUNCE_WAIT = 250;
export const DOC_WRITE_DEBOUNCE_MAX_WAIT = 1000;

export interface NaukarStateConfig {
  readonly extensionRegistry: ExtensionRegistry;
  readonly docChangeEmitter: DocChangeEmitter;
  readonly port: MessagePort;
}
