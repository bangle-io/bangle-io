import { Store, timeoutSchedular } from '@bangle.io/nsm';
import type { EternalVars } from '@bangle.io/shared-types';

// TODO: fix me
export type NaukarStore = Store;

export function createNaukarStore(eternalVars: EternalVars): NaukarStore {
  const store = Store.create({
    storeName: 'naukar-store',
    scheduler: timeoutSchedular(5),
    debug: (log) => {
      if (log.type === 'TX') {
        console.group(
          '[naukar] TX >',
          log.sourceSliceLineage,
          '>',
          log.actionId,
        );
        console.info(log.payload);
        console.info(log);
        console.groupEnd();
      } else {
        // console.info('NSM', log.type, log);
      }
    },
    state: [],
  });

  return store;
}
