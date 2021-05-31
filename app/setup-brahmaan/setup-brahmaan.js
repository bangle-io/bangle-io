import {
  Brahmaan,
  validateNonWorkerGlobalScope,
  checkModuleWorkerSupport,
} from 'brahmaan-worker/index';
import { bangleIOContext } from 'create-bangle-io-context/index';
validateNonWorkerGlobalScope();

export async function setupBrahmaan() {
  const moduleSupport = checkModuleWorkerSupport();
  if (moduleSupport) {
    const { default: handlers } = await import('./wrap-brahmaan-worker');
    return handlers;
  }
  return new Brahmaan({ bangleIOContext });
}
