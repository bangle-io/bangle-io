import idbReady from 'safari-14-idb-fix';

import { runMigrations } from '@bangle.io/db-app';
import { polyfills } from '@bangle.io/shared';
import { isSafari } from '@bangle.io/utils';

console.debug('Polyfilling ' + polyfills.length + ' features.');
let toWaitFor = [...polyfills];

if (isSafari) {
  toWaitFor.push(idbReady());
}

toWaitFor.push(runMigrations());

export function runAfterPolyfills(cb: () => void): void {
  if (toWaitFor.length === 0) {
    cb();

    return;
  }

  Promise.all(toWaitFor).then(() => {
    cb();
  });
}
