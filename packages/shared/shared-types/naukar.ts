import type * as Comlink from 'comlink';

export interface NaukarBare {
  isReady: () => Promise<boolean>;
}

export type NaukarRemote = Comlink.Remote<NaukarBare>;
