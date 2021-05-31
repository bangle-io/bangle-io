import {
  Naukar,
  validateNonWorkerGlobalScope,
  checkModuleWorkerSupport,
} from 'naukar-worker/index';
import { bangleIOContext } from 'create-bangle-io-context/index';
validateNonWorkerGlobalScope();

export async function setupNaukar() {
  const moduleSupport = checkModuleWorkerSupport();
  if (moduleSupport) {
    const { default: handlers } = await import('./wrap-naukar-worker');
    return handlers;
  }
  return new Naukar({ bangleIOContext });
}
