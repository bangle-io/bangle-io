import { DerivativeStore } from './base-store';
import type { CleanupCallback } from './cleanup';
import { hasIdleCallback } from './helpers';
import type { Store } from './store';
import { Metadata } from './transaction';

export const OP_NAME = 'OPERATION_NAME';

export type AnyOperationCallback = OperationCallback<any, any>;

export type OperationOpts = {
  deferred?: boolean;
  maxWait?: number;
};

const DEFAULT_MAX_WAIT = 15;

export type Operation<TSliceName extends string> = {
  name: string;
  run: (rootStore: Store<TSliceName>) => void;
  metadata: Metadata;
};

export type OperationCallback<
  TSliceName extends string,
  TParams extends any[],
> = (
  ...params: TParams
) => (store: OperationStore<TSliceName>) => void | Promise<void>;

export class OperationStore<
  TSliceName extends string = any,
> extends DerivativeStore<TSliceName> {
  private cleanupRan = false;
  private readonly _cleanupCallbacks: Set<CleanupCallback> = new Set();

  constructor(
    _rootStore: Store,
    name: string,
    private readonly opts: OperationOpts,
  ) {
    super(_rootStore, name);
  }

  /**
   * @internal
   */
  _addCleanup(cb: CleanupCallback): void {
    if (this.cleanupRan) {
      console.warn(
        `Adding a new cleanup to ${this.name} as cleanups have already run`,
      );
      void cb();

      return;
    }

    this._cleanupCallbacks.add(cb);
  }

  _runCleanup(): void {
    if (this.cleanupRan) {
      return;
    }

    for (const cleanup of this._cleanupCallbacks) {
      try {
        void cleanup();
      } catch (e) {
        console.error(e);
      }
    }
    this.cleanupRan = true;
  }
}

export function operation<TSliceName extends string>(opts?: OperationOpts) {
  return <TParams extends any[]>(
    cb: OperationCallback<TSliceName, TParams>,
  ): ((...params: TParams) => Operation<TSliceName>) => {
    const cache = new WeakMap<Store, OperationExecutor>();
    const name = cb.name || 'anonymous-operation';

    return createOperationRunner<TSliceName, TParams>(cache, cb, name, opts);
  };
}

function createOperationRunner<
  TSliceName extends string,
  TParams extends any[],
>(
  cache: WeakMap<Store, OperationExecutor>,
  cb: OperationCallback<TSliceName, TParams>,
  name: string,
  opts?: OperationOpts,
): (...params: TParams) => Operation<TSliceName> {
  return (...params: TParams) => {
    const run = (rootStore: Store) => {
      let operationExecutor = cache.get(rootStore);

      if (!operationExecutor) {
        operationExecutor = new OperationExecutor(cb, opts, name);
        cache.set(rootStore, operationExecutor);
      }
      operationExecutor.run(rootStore, params);
    };
    const metadata = new Metadata();

    metadata.appendMetadata(OP_NAME, name);

    return {
      name,
      run,
      metadata,
    };
  };
}

class OperationExecutor {
  opStore: OperationStore | undefined;

  constructor(
    public readonly operationCallback: AnyOperationCallback,
    public readonly opts: OperationOpts = {},
    public readonly name: string,
  ) {}

  private deferExecution(cb: () => void, waitFor: number): void {
    if (hasIdleCallback) {
      window.requestIdleCallback(cb, { timeout: waitFor });
    } else {
      setTimeout(cb, waitFor);
    }
  }

  run(rootStore: Store, params: unknown[]): void {
    this.scheduler(() => {
      this.opStore?._runCleanup();
      const opStore = new OperationStore(rootStore, this.name, this.opts);
      this.opStore = opStore;
      void this._run(opStore, params);
    });
  }

  private scheduler(cb: () => void): void {
    const waitFor =
      typeof this.opts.maxWait === 'number'
        ? this.opts.maxWait
        : DEFAULT_MAX_WAIT;

    if (this.opts.deferred) {
      this.deferExecution(cb, waitFor);
    } else {
      queueMicrotask(cb);
    }
  }

  private async _run(
    opStore: OperationStore,
    params: unknown[],
  ): Promise<void> {
    if (opStore.destroyed || this.opStore?._rootStore?.destroyed) {
      console.warn(
        `Operation ${this.name} can not run after the store was destroyed`,
      );

      return;
    }

    const result = this.operationCallback(...params)(opStore);

    if (result instanceof Promise) {
      await result;
    }
  }
}
