import { Manager } from '@bangle.dev/collab-server';

const SLOW_FACTOR = 1;

export function setupCollabManager(bangleIOContext, disk) {
  const manager = new Manager(bangleIOContext.specRegistry.schema, {
    disk,
    collectUsersTimeout: SLOW_FACTOR * 700,
    userWaitTimeout: SLOW_FACTOR * 500,
    instanceCleanupTimeout: SLOW_FACTOR * 2000,
  });
  return manager;
}
