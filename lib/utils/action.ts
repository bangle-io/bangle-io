// This is a simple helper to verify the types are correct
// usage can be:

import type { SliceKey } from '@bangle.io/create-store';

export function assertActionName<
  R extends string,
  A extends { name: `action::${R}:${string}` },
>(packageName: R, key: A | SliceKey<any, A>): void {}
