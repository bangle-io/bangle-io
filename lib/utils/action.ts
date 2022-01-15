// This is a simple helper to verify the types are correct
// usage can be:

import { SliceKey } from '@bangle.io/create-store';

// checks if action name is valid
export function assertActionName<
  R extends string,
  A extends { name: `action::${R}:${string}` },
>(packageName: R, key: SliceKey<any, A>): void {}
