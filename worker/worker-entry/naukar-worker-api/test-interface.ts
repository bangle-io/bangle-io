import type { NaukarWorkerAPI } from '@bangle.io/shared-types';
import {
  assertNotUndefined,
  BaseError,
  isWorkerGlobalScope,
} from '@bangle.io/utils';
import { getCollabManager } from '@bangle.io/worker-editor';

import type { NaukarStore } from '../store';

export const testInterface = (
  naukarStore: NaukarStore,
): NaukarWorkerAPI['test'] => {
  const testInterface: NaukarWorkerAPI['test'] = {
    handlesBaseError: async (e: BaseError) => {
      // send back the base error to test if transfer is working
      if (e instanceof BaseError) {
        return new BaseError({ message: 'Send me to main', code: 'TEST_CODE' });
      }

      return false;
    },

    isWorkerEnv: async () => {
      return isWorkerGlobalScope();
    },

    status: async () => {
      return true;
    },

    requestDeleteCollabInstance: async (wsPath: string) => {
      const collabManager = getCollabManager(naukarStore);
      assertNotUndefined(collabManager, 'collabManager must be defined');

      collabManager.requestDeleteInstance(wsPath);
    },

    throwCallbackError: async () => {
      setTimeout(() => {
        throw new Error('[naukar] I am a testThrowCallbackError');
      }, 0);

      return;
    },

    throwError: async () => {
      throw new Error('[naukar] I am a testThrowError');
    },
  };

  return testInterface;
};
