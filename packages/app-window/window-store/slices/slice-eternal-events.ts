import { createKey } from '@nalanda/core';

import { getStoreConfig } from '@bangle.io/window-common';

import { logger } from '../logger';

const key = createKey('window/sliceEternalVarsEvents', []);

export const sliceEternalVarsEvents = key.slice({});

key.effect((store) => {
  const { eternalVars } = getStoreConfig(store);
  // TODO implement emitter handling
  //   eternalVars.emitter.on('@event::database:workspace-create', () => {});
});
