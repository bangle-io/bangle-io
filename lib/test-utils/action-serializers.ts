import type { BaseAction, SliceKey } from '@bangle.io/create-store';

export type ActionTestFixtureType<A extends BaseAction> = {
  [K in A['name']]: Array<A extends { name: K } ? A : never>;
};

export function actionSerializerTestFixture<
  SL,
  A extends BaseAction,
  S,
  C extends { [key: string]: any } = any,
>(sliceKey: SliceKey<SL, A, S, C>, fixtures: ActionTestFixtureType<A>) {
  const actions: A[] = Object.values(fixtures);

  return actions.flatMap((r) => r);
}
