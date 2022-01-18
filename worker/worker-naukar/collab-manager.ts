import { Manager } from '@bangle.dev/collab-server';
import { Disk } from '@bangle.dev/disk';

import { ExtensionRegistry } from '@bangle.io/extension-registry';

const SLOW_FACTOR = 2;

export function setupCollabManager(
  extensionRegistry: ExtensionRegistry,
  disk: Disk,
) {
  const manager = new Manager(extensionRegistry.specRegistry.schema, {
    disk,
    collectUsersTimeout: SLOW_FACTOR * 700,
    userWaitTimeout: SLOW_FACTOR * 500,
    instanceCleanupTimeout: SLOW_FACTOR * 2000,
  });
  return manager;
}
