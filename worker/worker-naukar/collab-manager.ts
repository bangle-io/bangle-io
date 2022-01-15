import { Manager } from '@bangle.dev/collab-server';

const SLOW_FACTOR = 2;

export function setupCollabManager(extensionRegistry, disk) {
  const manager = new Manager(extensionRegistry.specRegistry.schema, {
    disk,
    collectUsersTimeout: SLOW_FACTOR * 700,
    userWaitTimeout: SLOW_FACTOR * 500,
    instanceCleanupTimeout: SLOW_FACTOR * 2000,
  });
  return manager;
}
