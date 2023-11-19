import { createKey, EffectStore, ref } from '@nalanda/core';
import { enablePatches, Patch, produceWithPatches } from 'immer';

import { defaultWorkerWindowStoreReplica } from '@bangle.io/constants';
import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { superJson } from '@bangle.io/nsm-3';
import { WorkerWindowStoreReplica } from '@bangle.io/shared-types';
import { slicePage } from '@bangle.io/slice-page';
import { sliceUI } from '@bangle.io/slice-ui';

enablePatches();

const key = createKey('window/sync-with-worker', [sliceUI, slicePage]);
const mirroredStateField = key.field(defaultWorkerWindowStoreReplica);

export const sliceSyncWithWindowStore = key.slice({});

const getPatchesRef = ref<Patch[]>(() => {
  return [];
});
const gtIdCounterRef = ref<number>(() => 0);

function updatePatches(
  store: EffectStore,
  [nextState, patches]: readonly [WorkerWindowStoreReplica, Patch[], Patch[]],
) {
  const patchesRef = getPatchesRef(store);
  patchesRef.current.push(...patches);
  store.dispatch(mirroredStateField.update(nextState));
}

key.effect((store) => {
  const { eternalVars } = getWindowStoreConfig(store);
  const patchesRef = getPatchesRef(store);
  // for re-running this effect
  const mirrorState = mirroredStateField.track(store);

  const idCounterRef = gtIdCounterRef(store);
  if (patchesRef.current.length === 0) {
    return;
  }

  const patches = patchesRef.current;
  patchesRef.current = [];

  void eternalVars.naukar.receivePatches({
    id: idCounterRef.current++,
    patches: superJson.stringify(patches),
  });
});

// Following effects are responsible for creating patches
key.effect((store) => {
  const { colorScheme, widescreen } = sliceUI.track(store);
  const mirrorState = mirroredStateField.get(store.state);
  updatePatches(
    store,
    produceWithPatches(mirrorState, (draft) => {
      draft.ui.colorScheme = colorScheme;
      draft.ui.widescreen = widescreen;
    }),
  );
});

key.effect((store) => {
  const { location, pageLifeCycle } = slicePage.track(store);
  const mirrorState = mirroredStateField.get(store.state);

  updatePatches(
    store,
    produceWithPatches(mirrorState, (draft) => {
      draft.page.lifecycle = pageLifeCycle;
      draft.page.location = location;
    }),
  );
});
