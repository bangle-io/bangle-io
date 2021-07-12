import { createNaukar } from 'naukar-worker';
import { initExtensionRegistry, initialAppState } from 'shared';

// Note this will either be run in worker environment or (fallback) main thread
export default createNaukar({
  extensionRegistry: initExtensionRegistry(),
  initialAppState,
});
