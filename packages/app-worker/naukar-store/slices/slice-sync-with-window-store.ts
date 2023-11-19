import { createKey } from '@nalanda/core';

import { defaultWorkerWindowStoreReplica } from '@bangle.io/constants';
import { WorkerWindowStoreReplica } from '@bangle.io/shared-types';

const key = createKey('naukar/slice-sync-with-window-store', []);

const windowReplicaField = key.field(defaultWorkerWindowStoreReplica);

function updateWindowReplica(
  nextState: (current: WorkerWindowStoreReplica) => WorkerWindowStoreReplica,
) {
  return windowReplicaField.update((current) => {
    return nextState(current);
  });
}

const pageLocationField = key.derive((state) => {
  return windowReplicaField.get(state).page?.location;
});

const pageLifecycleField = key.derive((state) => {
  return windowReplicaField.get(state).page?.lifecycle;
});

const uiWidescreenField = key.derive((state) => {
  return windowReplicaField.get(state).ui?.widescreen;
});

export const windowStoreReplicaSlice = key.slice({
  updateWindowReplica: updateWindowReplica,

  uiWidescreen: uiWidescreenField,
  pageLocation: pageLocationField,
  pageLifecycle: pageLifecycleField,
});
