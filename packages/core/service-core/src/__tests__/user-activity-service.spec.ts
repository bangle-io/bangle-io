import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment, sleep } from '@bangle.io/test-utils';
import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserActivityService } from '../user-activity-service';

const TEST_WS_NAME = 'test-workspace';
const TEST_WS_PATH = 'test-workspace:test.md';
const TEST_WS_PATH2 = 'test-workspace:test2.md';
const TEST_WS_PATH3 = 'test-workspace:test3.md';
const TEST_WS_PATH4 = 'test-workspace:test4.md';

async function setupUserActivityService({
  controller = new AbortController(),
  cooldownMs = 500,
  maxEntries = 10,
}: {
  cooldownMs?: number;
  maxEntries?: number;
  controller?: AbortController;
}) {
  const store = createStore();

  const testEnv = createTestEnvironment({ controller });

  testEnv.setDefaultConfig();
  testEnv.getContainer().setConfig(UserActivityService, () => ({
    activityCooldownMs: cooldownMs,
    maxRecentEntries: maxEntries,
    emitter: testEnv.rootEmitter.scoped(
      ['event::command:result'],
      controller.signal,
    ),
  }));

  const services = testEnv.instantiateAll('userActivityService');
  const navigation = services.navigation;
  const workspaceOps = services.workspaceOps;
  const userActivityService = services.userActivityService;

  await testEnv.mountAll();

  // Create a test workspace
  await workspaceOps.createWorkspaceInfo({
    name: TEST_WS_NAME,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });

  await services.fileSystem.createTextFile(
    TEST_WS_PATH,
    'I am content of test.md',
  );
  await services.fileSystem.createTextFile(
    TEST_WS_PATH2,
    'I am content of test2.md',
  );
  await services.fileSystem.createTextFile(
    TEST_WS_PATH3,
    'I am content of test3.md',
  );
  await services.fileSystem.createTextFile(
    TEST_WS_PATH4,
    'I am content of test4.md',
  );

  // Not proud of this, but it's a hack to wait for the system to be ready
  await vi.waitUntil(async () => {
    return services.workspaceState.hasWorkspace(TEST_WS_NAME);
  });

  return {
    userActivityService,
    navigation,
    store,
  };
}

describe('UserActivityService', () => {
  let controller = new AbortController();
  beforeEach(async () => {
    controller = new AbortController();
  });
  afterEach(async () => {
    controller.abort();
  });

  it('should record and retrieve ws-path activity', async () => {
    const service = await setupUserActivityService({ controller });
    const data = { wsPath: TEST_WS_PATH };
    service.navigation.goWsPath(TEST_WS_PATH);

    expect(service.navigation.resolveAtoms().wsPath?.wsPath).toEqual(
      TEST_WS_PATH,
    );

    const activities = await vi.waitUntil(async () => {
      const result = await service.userActivityService.getRecent(
        TEST_WS_NAME,
        'ws-path',
      );
      if (result.length === 0) {
        return undefined;
      }
      return result;
    });

    expect(activities).toHaveLength(1);
    expect(activities?.[0]).toEqual({
      entityType: 'ws-path',
      data,
      timestamp: expect.any(Number),
    });
  });

  it('it should work for multiple paths', async () => {
    const { userActivityService, navigation } = await setupUserActivityService({
      controller,
    });
    navigation.goWsPath(TEST_WS_PATH);
    await sleep(5);
    navigation.goWsPath(TEST_WS_PATH2);
    await sleep(5);
    navigation.goWsPath(TEST_WS_PATH3);

    await sleep(100);

    const activities = await userActivityService.getRecent(
      TEST_WS_NAME,
      'ws-path',
    );
    expect(activities).toHaveLength(3);
  });

  it('should limit entries to maxRecentEntries', async () => {
    const { userActivityService, navigation } = await setupUserActivityService({
      controller,
      maxEntries: 2, // Set small max for testing
    });

    // Record 3 paths, but only 2 should be kept
    navigation.goWsPath(TEST_WS_PATH);
    await sleep(5);
    navigation.goWsPath(TEST_WS_PATH2);
    await sleep(5);
    navigation.goWsPath(TEST_WS_PATH3);
    await sleep(5);
    navigation.goWsPath(TEST_WS_PATH4);
    await sleep(100);

    const activities = await userActivityService.getRecent(
      TEST_WS_NAME,
      'ws-path',
    );

    expect(activities).toHaveLength(2);
    // reverse order
    expect(activities?.[0]?.data.wsPath).toBe(TEST_WS_PATH4);
    expect(activities?.[1]?.data.wsPath).toBe(TEST_WS_PATH3);
  });

  it('should record command activity', async () => {
    const { userActivityService, navigation } = await setupUserActivityService({
      controller,
    });

    navigation.goWsPath(TEST_WS_PATH);
    await userActivityService._recordCommandResult({
      type: 'success',
      from: 'test',
      command: {
        id: 'test-command',
        omniSearch: true,
        args: {},
      },
    });

    const activities = await userActivityService.getRecent(
      TEST_WS_NAME,
      'command',
    );

    expect(activities).toHaveLength(1);
    expect(activities[0]).toEqual({
      entityType: 'command',
      data: { commandId: 'test-command' },
      timestamp: expect.any(Number),
    });
  });

  it('should skip recording non-omni-search commands', async () => {
    const { userActivityService, navigation } = await setupUserActivityService({
      controller,
    });

    navigation.goWsPath(TEST_WS_PATH);

    await userActivityService._recordCommandResult({
      type: 'success',
      from: 'test',

      command: {
        id: 'test-command',
        omniSearch: false,
        args: {},
      },
    });
    const activities = await userActivityService.getRecent(
      TEST_WS_NAME,
      'command',
    );

    expect(activities).toHaveLength(0);
  });

  it('should handle navigation to non-existent path', async () => {
    const { userActivityService, navigation } = await setupUserActivityService({
      controller,
    });
    const nonExistentPath = 'test-workspace:does-not-exist.md';

    navigation.goWsPath(nonExistentPath);
    await sleep(10);

    const activities = await userActivityService.getRecent(
      TEST_WS_NAME,
      'ws-path',
    );

    expect(activities).toHaveLength(0);
  });
});
