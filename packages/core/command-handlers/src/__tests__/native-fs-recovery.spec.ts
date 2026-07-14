// @vitest-environment jsdom
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupTest } from './test-utils';

describe('command::ui:reconnect-native-fs-workspace', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('replaces the stored handle and reloads services after a valid selection', async () => {
    const { dispatch, services, getCommandResults } = await setupTest({
      targetId: 'command::ui:reconnect-native-fs-workspace',
      autoNavigate: false,
    });
    const originalHandle = { name: 'test-ws' };
    const replacementHandle = { name: 'test-ws' };
    await services.workspaceOps.createWorkspaceInfo({
      name: 'test-ws',
      type: WORKSPACE_STORAGE_TYPE.NativeFS,
      metadata: { rootDirHandle: originalHandle },
    });
    vi.stubGlobal(
      'showDirectoryPicker',
      vi.fn().mockResolvedValue(replacementHandle),
    );
    const reloadSpy = vi.spyOn(services.workbenchState, 'reloadUi');

    dispatch('command::ui:reconnect-native-fs-workspace', {
      wsName: 'test-ws',
    });

    await vi.waitFor(async () => {
      expect(
        await services.workspaceOps.getWorkspaceMetadata('test-ws'),
      ).toEqual({ rootDirHandle: replacementHandle });
      expect(reloadSpy).toHaveBeenCalledOnce();
      expect(getCommandResults().at(-1)?.type).toBe('success');
    });
  });

  it('keeps the stored handle when the selected folder name does not match', async () => {
    const { dispatch, services, getCommandResults } = await setupTest({
      targetId: 'command::ui:reconnect-native-fs-workspace',
      autoNavigate: false,
    });
    const originalHandle = { name: 'test-ws' };
    await services.workspaceOps.createWorkspaceInfo({
      name: 'test-ws',
      type: WORKSPACE_STORAGE_TYPE.NativeFS,
      metadata: { rootDirHandle: originalHandle },
    });
    vi.stubGlobal(
      'showDirectoryPicker',
      vi.fn().mockResolvedValue({ name: 'different-folder' }),
    );
    const reloadSpy = vi.spyOn(services.workbenchState, 'reloadUi');

    dispatch('command::ui:reconnect-native-fs-workspace', {
      wsName: 'test-ws',
    });

    await vi.waitFor(() => {
      expect(getCommandResults().at(-1)?.type).toBe('failure');
    });
    expect(await services.workspaceOps.getWorkspaceMetadata('test-ws')).toEqual(
      { rootDirHandle: originalHandle },
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
