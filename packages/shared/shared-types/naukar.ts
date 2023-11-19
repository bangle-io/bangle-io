import type * as Comlink from 'comlink';

import { DebugFlags } from './debug-flags';
import { WorkerWindowStoreReplica } from './worker-sync';

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
  readDebugFlags: () => DebugFlags;
  ok: () => boolean;
  destroy: () => void;

  readWindowState: () => WorkerWindowStoreReplica;
  sendPatches: (obj: { id: number; patches: string }) => void;
  sendWindowActions: (windowActions: WindowActions) => void;
};

export type NaukarRemote = Comlink.Remote<NaukarBare>;
