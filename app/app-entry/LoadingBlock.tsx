import React, { useEffect, useState } from 'react';
import idbReady from 'safari-14-idb-fix';

import { runMigrations } from '@bangle.io/db-app';
import { polyfills } from '@bangle.io/shared';
import { isSafari } from '@bangle.io/utils';

import { Entry } from './entry';

console.debug('Polyfilling ' + polyfills.length + ' features.');
let toWaitFor = [...polyfills];

if (isSafari) {
  toWaitFor.push(idbReady());
}

toWaitFor.push(runMigrations());

export function LoadingBlock() {
  const [loaded, updateLoaded] = useState(toWaitFor.length === 0);

  useEffect(() => {
    if (toWaitFor.length > 0) {
      Promise.all(toWaitFor).then(() => {
        updateLoaded(true);
      });
    }
  }, []);

  return loaded ? <Entry /> : null;
}
