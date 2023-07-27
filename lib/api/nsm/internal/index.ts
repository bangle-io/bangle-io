import type { EffectCreator, Slice } from '@bangle.io/nsm-3';

import { editorManagerProxy, editorManagerProxyEffects } from '../editor';

export * as eternalVars from './eternal-vars';
export { _internal_getStore, _internal_setStore } from './internals';
export * as workspace from './workspace';

export const slices: Array<Slice<any, any, any>> = [editorManagerProxy];
export const effects: EffectCreator[] = [...editorManagerProxyEffects];
