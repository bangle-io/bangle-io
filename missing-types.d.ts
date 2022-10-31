interface Lock {
  readonly mode: 'exclusive' | 'shared';
  readonly name: string;
}

interface LockInfo {
  clientId?: string;
  mode?: 'exclusive' | 'shared';
  name?: string;
}

interface LockManagerSnapshot {
  held?: LockInfo[] | undefined;
  pending?: LockInfo[] | undefined;
}

interface LockManagerRequestOptions {
  mode?: 'exclusive' | 'shared' | undefined;
  ifAvailable?: boolean | undefined;
  steal?: boolean | undefined;
  signal?: AbortSignal | undefined;
}

interface LockManager {
  request: ((
    name: string,
    callback: (lock: Lock) => Promise<any>,
  ) => Promise<undefined>) &
    (<T extends LockManagerRequestOptions>(
      name: string,
      options: T,
      callback: (
        lock: T['ifAvailable'] extends true ? Lock | null : Lock,
      ) => Promise<any>,
    ) => Promise<undefined>);
  query: () => Promise<LockManagerSnapshot>;
}

interface Navigator {
  locks: LockManager;
}

declare var _e2eNaukarHelpers:
  | undefined
  | import('@bangle.io/e2e-types').E2ENaukarTypes;
declare var _newE2eHelpers2:
  | undefined
  | import('@bangle.io/e2e-types').E2ETypes;

declare var __BANGLE_INJECTED_CONFIG__: string | undefined;

declare module 'js-sha1' {
  function sha1<T>(dest: string | T[] | ArrayBuffer | Uint8Array): string;

  namespace sha1 {
    export function hex(arg: string): string;
    export function update<T>(
      arg: string | T[] | Uint8Array | ArrayBuffer,
    ): string;
    export function array(): Uint8Array;
    export function digest(arg: any): Uint8Array;
    export function arrayBuffer(arg: any): ArrayBuffer;
  }

  export = sha1;
}
