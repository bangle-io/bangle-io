import { setupCollabManager } from './collab-manager';
import { config } from 'config/index';
import * as idb from 'idb-keyval';

export class Brahmaan {
  constructor({ bangleIOContext }) {
    const envType =
      typeof WorkerGlobalScope !== 'undefined' &&
      // eslint-disable-next-line no-restricted-globals, no-undef
      self instanceof WorkerGlobalScope
        ? 'worker'
        : 'window';
    console.debug('Brahmaan running in ', envType);

    this.bangleIOContext = bangleIOContext;
    this.manager = setupCollabManager(bangleIOContext);
    this.cachedWorkspaces = undefined;
  }

  async handleCollabRequest(...args) {
    return this.manager.handleRequest(...args);
  }

  validate() {
    return {
      good: 'true',
    };
  }
}
