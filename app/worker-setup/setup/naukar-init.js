import { createNaukar } from 'naukar-worker/index';
import { bangleIOContext, initialAppState } from 'shared/index';

// Note this will either be run in worker environment or (fallback) main thread
export default createNaukar({
  bangleIOContext,
  initialAppState,
});
