import type * as Comlink from 'comlink';

import { DebugFlags } from './debug-flags';

// should always be a Record<string, AnyFunction>
export type NaukarBare = {
  //
  getDebugFlags: () => DebugFlags;
  ok: () => boolean;
};

export type NaukarRemote = Comlink.Remote<NaukarBare>;
