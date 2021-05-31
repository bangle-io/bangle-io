import { setupCollabManager } from './collab-manager';

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
  }

  handleCollabRequest(...args) {
    return this.manager.handleRequest(...args);
  }

  validate() {
    return {
      good: 'true',
    };
  }
}
