import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment, sleep } from '@bangle.io/test-utils';
import { WsPath } from '@bangle.io/ws-path';
import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserActivityService } from '../user-activity-service';

const TEST_WS_NAME = 'test-workspace';
const TEST_WS_PATH = 'test-workspace:test.md';
const TEST_WS_PATH2 = 'test-workspace:test2.md';
const TEST_WS_PATH3 = 'test-workspace:test3.md';
const TEST_WS_PATH4 = 'test-workspace:test4.md';

const TEST_WS_NAME2 = 'test-workspace-2';
const TEST_WS_PATH_IN_WS2 = 'test-workspace-2:file-in-ws2.md';

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
  const testEnv = createTestEnvironment({ controller }).setDefaultConfig();

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

  // Create a second test workspace
  await workspaceOps.createWorkspaceInfo({
    name: TEST_WS_NAME2,
    type: WORKSPACE_STORAGE_TYPE.Memory,
    metadata: {},
  });

  await services.fileSystem.createTextFile(
    TEST_WS_PATH_IN_WS2,
    'Content of file in ws2',
  );

  // Not proud of this, but it's a hack to wait for the system to be ready
  await vi.waitUntil(async () => {
    return (
      services.workspaceState.hasWorkspace(TEST_WS_NAME) &&
      services.workspaceState.hasWorkspace(TEST_WS_NAME2)
    );
  });

  return {
    userActivityService,
    navigation,
    goWsPath: async (path: string) => {
      services.navigation.goWsPath(path);
      await vi.waitUntil(async () => {
        return (
          services.workspaceState.resolveAtoms().currentWsPath?.wsPath === path
        );
      });
    },
    store,
    workspaceState: services.workspaceState,
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
    await service.goWsPath(TEST_WS_PATH);

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
    const { userActivityService, goWsPath } = await setupUserActivityService({
      controller,
    });
    await goWsPath(TEST_WS_PATH);
    await goWsPath(TEST_WS_PATH2);
    await goWsPath(TEST_WS_PATH3);
    await sleep(5);

    await vi.waitUntil(async () => {
      const result = await userActivityService.getRecent(
        TEST_WS_NAME,
        'ws-path',
      );

      return result.length === 3;
    });
  });

  it('should limit entries to maxRecentEntries', async () => {
    const { userActivityService, goWsPath } = await setupUserActivityService({
      controller,
      maxEntries: 2,
    });

    // Record 3 paths, but only 2 should be kept
    await goWsPath(TEST_WS_PATH);
    await goWsPath(TEST_WS_PATH2);
    await goWsPath(TEST_WS_PATH3);
    await goWsPath(TEST_WS_PATH4);
    await sleep();

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
    const { userActivityService, goWsPath } = await setupUserActivityService({
      controller,
    });

    await goWsPath(TEST_WS_PATH);

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
    const { userActivityService, goWsPath } = await setupUserActivityService({
      controller,
    });

    await goWsPath(TEST_WS_PATH);

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

  describe('Starring', () => {
    test('should record starred ws paths', async () => {
      const { userActivityService, goWsPath } = await setupUserActivityService({
        controller,
      });

      await goWsPath(TEST_WS_PATH);

      await userActivityService.toggleStarItem(WsPath.fromString(TEST_WS_PATH));

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH]);
      });
    });

    test('should unstar a previously starred ws path', async () => {
      const { userActivityService, goWsPath } = await setupUserActivityService({
        controller,
      });
      const wsPath = WsPath.fromString(TEST_WS_PATH);
      await goWsPath(TEST_WS_PATH);

      // Star and then unstar
      await userActivityService.toggleStarItem(wsPath);
      await userActivityService.toggleStarItem(wsPath);

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([]);
      });
    });

    test('should allow starring multiple ws paths', async () => {
      const { userActivityService, goWsPath } = await setupUserActivityService({
        controller,
      });
      const wsPath1 = WsPath.fromString(TEST_WS_PATH);
      const wsPath2 = WsPath.fromString(TEST_WS_PATH2);

      await goWsPath(TEST_WS_PATH); // Ensures workspace is active for recording
      await userActivityService.toggleStarItem(wsPath1);
      await goWsPath(TEST_WS_PATH2); // Ensures workspace is active for recording
      await userActivityService.toggleStarItem(wsPath2);

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH, TEST_WS_PATH2]);
      });
    });

    test('should toggle star status correctly on multiple calls', async () => {
      const { userActivityService, goWsPath } = await setupUserActivityService({
        controller,
      });
      const wsPath = WsPath.fromString(TEST_WS_PATH);
      await goWsPath(TEST_WS_PATH);

      // Star -> Unstar -> Star
      await userActivityService.toggleStarItem(wsPath);
      await userActivityService.toggleStarItem(wsPath);
      await userActivityService.toggleStarItem(wsPath);

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH]);
      });
    });

    test('should handle starring in different workspaces correctly', async () => {
      const { userActivityService, goWsPath } = await setupUserActivityService({
        controller,
      });

      const wsPath1InWs1 = WsPath.fromString(TEST_WS_PATH);
      const wsPathInWs2 = WsPath.fromString(TEST_WS_PATH_IN_WS2);

      // Star item in the first workspace
      await goWsPath(TEST_WS_PATH); // Sets current workspace to TEST_WS_NAME
      await userActivityService.toggleStarItem(wsPath1InWs1);

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH]);
      });

      await goWsPath(TEST_WS_PATH_IN_WS2);
      await userActivityService.toggleStarItem(wsPathInWs2);

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH_IN_WS2]);
      });

      await goWsPath(TEST_WS_PATH);

      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH]);
      });

      await goWsPath(TEST_WS_PATH_IN_WS2);
      await vi.waitFor(async () => {
        const { starredWsPaths } = await userActivityService.resolveAtoms();
        expect(starredWsPaths).toEqual([TEST_WS_PATH_IN_WS2]);
      });
    });
  });
});
