// This is a simple helper to verify the types are correct
// usage can be:

import { SliceKey } from '@bangle.io/create-store';

// assertActionType('my-pkg', {} as TypeToAssert);
// assertActionType('my-pkg', {} as TypeToAssert);
export function assertActionType<
  R extends string,
  T extends { name: `action::${R}:${string}` },
>(packageName: R, action: T): void {}

export function assertActionName<
  R extends string,
  A extends { name: `action::${R}:${string}` },
>(packageName: R, key: SliceKey<any, A>): void {}
