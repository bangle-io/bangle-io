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

declare var _nsmE2e: undefined | import('@bangle.io/e2e-types').NSME2eTypes;

declare var __BANGLE_INJECTED_CONFIG__: string | undefined;
