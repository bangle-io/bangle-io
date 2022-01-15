import { initExtensionRegistry } from '@bangle.io/shared';
import { createNaukar } from '@bangle.io/worker-naukar';

// Note this will either be run in worker environment or (fallback) main thread
export default createNaukar(initExtensionRegistry());
