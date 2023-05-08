import { onBeforeStoreLoad } from '@bangle.io/shared';
import { createNaukar } from '@bangle.io/worker-naukar';

const { registry, storageEmitter } = onBeforeStoreLoad();
// Note this will either be run in worker environment or (fallback) main thread
export default createNaukar(registry, storageEmitter);
