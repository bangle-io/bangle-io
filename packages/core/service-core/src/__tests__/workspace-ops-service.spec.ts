import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('WorkspaceOpsService', () => {
  let controller: AbortController;

  beforeEach(() => {
    controller = new AbortController();
  });

  afterEach(() => {
    controller.abort();
  });

  it('caches workspace info by workspace name without aliasing query options', async () => {
    const testEnv = createTestEnvironment({ controller });
    const services = testEnv.instantiateAll();
    await testEnv.mountAll();

    const foo = await services.workspaceOps.createWorkspaceInfo({
      name: 'foo',
      type: WORKSPACE_STORAGE_TYPE.Browser,
      metadata: {},
    });
    const foobrowser = await services.workspaceOps.createWorkspaceInfo({
      name: 'foobrowser',
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.workspaceOps.createWorkspaceInfo({
      name: 'deleted',
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await services.workspaceOps.deleteWorkspaceInfo('deleted');

    await expect(
      services.workspaceOps.getWorkspaceInfo('foo', {
        type: WORKSPACE_STORAGE_TYPE.Browser,
      }),
    ).resolves.toEqual(foo);
    await expect(
      services.workspaceOps.getWorkspaceInfo('foo', {
        type: WORKSPACE_STORAGE_TYPE.Memory,
      }),
    ).resolves.toBeUndefined();
    await expect(
      services.workspaceOps.getWorkspaceInfo('foobrowser'),
    ).resolves.toEqual(foobrowser);
    await expect(
      services.workspaceOps.getWorkspaceInfo('deleted', {
        allowDeleted: true,
      }),
    ).resolves.toMatchObject({ name: 'deleted', deleted: true });
    await expect(
      services.workspaceOps.getWorkspaceInfo('deleted'),
    ).resolves.toBeUndefined();
  });
});
