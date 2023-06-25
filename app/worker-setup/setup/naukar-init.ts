import { setupEternalVars } from '@bangle.io/shared';
import { createNaukar } from '@bangle.io/worker-entry';

const eternalVars = setupEternalVars();
// Note this will either be run in worker environment or (fallback) main thread
export default createNaukar(eternalVars);
