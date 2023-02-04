// 3 Generics that are optional

import type { EffectsBase, RawAction, SelectorFn } from './common';
import type { SliceConfig } from './slice';
import { Slice, SliceKey } from './slice';

export function key<K extends string, SS extends object, DS extends Slice[]>(
  key: K,
  deps: DS,
  initState: SS,
): SliceKey<K, SS, {}, DS>;
export function key<
  K extends string,
  SS extends object,
  DS extends Slice[],
  SE extends Record<string, SelectorFn<SS, DS, any>>,
>(key: K, deps: DS, initState: SS, selector: SE): SliceKey<K, SS, SE, DS>;
export function key(key: any, deps: any, initState: any, selector?: any): any {
  return new SliceKey(key, deps, initState, selector || {});
}

export function slice<
  SK extends SliceKey<any, any, any, any>,
  A extends Record<
    string,
    RawAction<any[], SK['initState'], SK['dependencies']>
  >,
>({
  key,
  actions,
  effects,
  config = {},
}: {
  key: SK;
  actions: A;
  effects?: EffectsBase<
    Slice<SK['key'], SK['initState'], SK['dependencies'], A, SK['selectors']>
  >;
  config?: SliceConfig;
}): Slice<SK['key'], SK['initState'], SK['dependencies'], A, SK['selectors']> {
  return new Slice(key, actions, effects ? [effects] : [], config);
}
