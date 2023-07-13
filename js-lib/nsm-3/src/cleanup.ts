import type { EffectStore } from './effect';
import { OperationStore } from './operation';

export type CleanupCallback = () => void | Promise<void>;

export function cleanup(
  store: EffectStore<any> | OperationStore,
  cb: CleanupCallback,
): void {
  if (store instanceof OperationStore) {
    store._addCleanup(cb);
  } else {
    store._runInstance?.addCleanup(cb);
  }
}
