import { createKey } from '@nalanda/core';

import { getWindowStoreConfig } from '@bangle.io/lib-common';
import type { EternalVarsEvent } from '@bangle.io/shared-types';

import { logger } from '../logger';

const key = createKey('window/sliceEternalVarsEvents', []);

export const sliceEternalVarsEvents = key.slice({});

key.effect((store) => {
  const { eternalVars } = getWindowStoreConfig(store);
  // TODO implement emitter handling
  //   eternalVars.emitter.on('@event::database:workspace-create', () => {});
});

key.effect((store) => {
  const { eternalVars } = getWindowStoreConfig(store);
});
