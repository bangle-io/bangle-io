// 3 Generics that are optional

import type { EffectsBase, RawAction, SelectorFn } from './common';
import type { SliceConfig } from './slice';
import { Slice, SliceKey } from './slice';

interface SliceOpts<
  K extends string,
  SS extends object,
  DS extends Slice[],
  A extends Record<string, RawAction<any[], SS, DS>>,
  SE extends Record<string, SelectorFn<SS, DS, any>>,
> {
  key: K;
  initState: SS;
  config?: SliceConfig;
  dependencies: DS;
  actions: A;
  selectors: SE;
  effects?: Array<EffectsBase<Slice<K, SS, DS, A, SE>>>;
}

// 8. All 3 DS, A, SE
export function slice<
  K extends string,
  SS extends object,
  DS extends Slice[],
  A extends Record<string, RawAction<any[], SS, DS>>,
  SE extends Record<string, SelectorFn<SS, DS, any>>,
>(opts: SliceOpts<K, SS, DS, A, SE>): Slice<K, SS, DS, A, SE>;

// 7. A, SE
export function slice<
  K extends string,
  SS extends object,
  A extends Record<string, RawAction<any[], SS, []>>,
  SE extends Record<string, SelectorFn<SS, [], any>>,
>(opts: {
  key: K;
  initState: SS;
  config?: SliceConfig;
  actions: A;
  selectors: SE;
  effects?: Array<EffectsBase<Slice<K, SS, [], A, SE>>>;
}): Slice<K, SS, [], A, SE>;

// 6. DS, SE
export function slice<
  K extends string,
  SS extends object,
  DS extends Slice[],
  SE extends Record<string, SelectorFn<SS, DS, any>>,
>(opts: {
  key: K;
  initState: SS;
  config?: SliceConfig;
  dependencies: DS;
  selectors: SE;
  effects?: Array<EffectsBase<Slice<K, SS, DS, {}, SE>>>;
}): Slice<K, SS, DS, {}, SE>;

// 5. DS, A
export function slice<
  K extends string,
  SS extends object,
  DS extends Slice[],
  A extends Record<string, RawAction<any[], SS, DS>>,
>(opts: {
  key: K;
  initState: SS;
  config?: SliceConfig;
  dependencies: DS;
  actions: A;
  effects?: Array<EffectsBase<Slice<K, SS, DS, A, {}>>>;
}): Slice<K, SS, DS, A, {}>;

// 4. Only SE
export function slice<
  K extends string,
  SS extends object,
  SE extends Record<string, SelectorFn<SS, [], any>>,
>(opts: {
  key: K;
  initState: SS;
  config?: SliceConfig;
  selectors: SE;
  effects?: Array<EffectsBase<Slice<K, SS, [], {}, SE>>>;
}): Slice<K, SS, [], {}, SE>;

// 3. Only A
export function slice<
  K extends string,
  SS extends object,
  A extends Record<string, RawAction<any[], SS, []>>,
>(opts: {
  key: K;
  initState: SS;
  config?: SliceConfig;
  actions: A;
  effects?: Array<EffectsBase<Slice<K, SS, [], A, {}>>>;
}): Slice<K, SS, [], A, {}>;

// 2. Only DS
export function slice<
  K extends string,
  SS extends object,
  DS extends Slice[],
>(opts: {
  key: K;
  initState: SS;
  config?: SliceConfig;
  dependencies: DS;
  effects?: Array<EffectsBase<Slice<K, SS, DS, {}, {}>>>;
}): Slice<K, SS, DS, {}, {}>;

// 1. None of DS, A, SE
export function slice<K extends string, SS extends object>(opts: {
  key: K;
  initState: SS;
}): Slice<K, SS, [], {}, {}>;

export function slice(args: any): any {
  const {
    key,
    initState,
    config = {},
    effects = [],
    selectors = {},
    dependencies = [],
    actions = {},
  } = args as Partial<SliceOpts<any, any, any, any, any>>;
  const sliceKey = new SliceKey(key, initState, selectors, dependencies);

  return new Slice(sliceKey, actions, effects, config);
}
