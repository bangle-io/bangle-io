// This is a simple helper to verify the types are correct
// usage can be:
// assertActionType('my-pkg', {} as TypeToAssert);
export function assertActionType<
  R extends string,
  T extends { name: `action::${R}:${string}` },
>(packageName: R, action: T): void {}
