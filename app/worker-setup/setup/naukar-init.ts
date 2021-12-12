import { createNaukar } from '@bangle.io/naukar-worker';
import { initExtensionRegistry } from '@bangle.io/shared';

// Note this will either be run in worker environment or (fallback) main thread
export default createNaukar(initExtensionRegistry());
