import type * as Comlink from 'comlink';

import { DebugFlags } from './debug-flags';

export type WindowActions =
  | undefined
  | {
      pageBlockPageReload: (options: { block: boolean }) => Promise<void>;
    };

() => {
  // It is needed for this to be a Record<string, AnyFunction>
  //  so that we can proxy it easily.
  let _x = {} as NonNullable<WindowActions> satisfies Record<
    string,
    (...args: any[]) => Promise<any>
  >;
};

// should always be a Record<string, AnyFunction>
export type NaukarBare = {
  //
  getDebugFlags: () => DebugFlags;
  ok: () => boolean;

  receivePatches: (obj: { id: number; patches: string }) => void;
  receiveWindowActions: (windowActions: WindowActions) => void;
};

export type NaukarRemote = Comlink.Remote<NaukarBare>;
