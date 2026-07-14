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

describe('command::ui:locate-native-fs-workspace', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Passes the isFileSystemDirectoryHandle guard the handler applies to
  // metadata restored from untyped storage.
  const makeStoredHandle = (name: string) => ({
    name,
    kind: 'directory',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });

  it('anchors the picker at the stored handle and leaves everything unchanged', async () => {
    const { dispatch, services, getCommandResults } = await setupTest({
      targetId: 'command::ui:locate-native-fs-workspace',
      autoNavigate: false,
    });
    const storedHandle = makeStoredHandle('test-ws');
    await services.workspaceOps.createWorkspaceInfo({
      name: 'test-ws',
      type: WORKSPACE_STORAGE_TYPE.NativeFS,
      metadata: { rootDirHandle: storedHandle },
    });
    const pickedHandle = makeStoredHandle('whatever-was-selected');
    const picker = vi.fn().mockResolvedValue(pickedHandle);
    vi.stubGlobal('showDirectoryPicker', picker);

    dispatch('command::ui:locate-native-fs-workspace', { wsName: 'test-ws' });

    await vi.waitFor(() => {
      expect(getCommandResults().at(-1)?.type).toBe('success');
    });
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'read', startIn: storedHandle }),
    );
    // Reveal-only: the selection is discarded, no permission prompt fires,
    // and the stored metadata is untouched.
    expect(storedHandle.requestPermission).not.toHaveBeenCalled();
    expect(pickedHandle.requestPermission).not.toHaveBeenCalled();
    expect(await services.workspaceOps.getWorkspaceMetadata('test-ws')).toEqual(
      { rootDirHandle: storedHandle },
    );
  });

  it('treats cancelling the dialog as a successful reveal', async () => {
    const { dispatch, services, getCommandResults } = await setupTest({
      targetId: 'command::ui:locate-native-fs-workspace',
      autoNavigate: false,
    });
    const storedHandle = makeStoredHandle('test-ws');
    await services.workspaceOps.createWorkspaceInfo({
      name: 'test-ws',
      type: WORKSPACE_STORAGE_TYPE.NativeFS,
      metadata: { rootDirHandle: storedHandle },
    });
    vi.stubGlobal(
      'showDirectoryPicker',
      vi
        .fn()
        .mockRejectedValue(
          new DOMException('The user aborted a request.', 'AbortError'),
        ),
    );

    dispatch('command::ui:locate-native-fs-workspace', { wsName: 'test-ws' });

    await vi.waitFor(() => {
      expect(getCommandResults().at(-1)?.type).toBe('success');
    });
    expect(await services.workspaceOps.getWorkspaceMetadata('test-ws')).toEqual(
      { rootDirHandle: storedHandle },
    );
  });

  it('fails without opening a picker when the workspace does not exist', async () => {
    const { dispatch, getCommandResults } = await setupTest({
      targetId: 'command::ui:locate-native-fs-workspace',
      autoNavigate: false,
    });
    const picker = vi.fn();
    vi.stubGlobal('showDirectoryPicker', picker);

    dispatch('command::ui:locate-native-fs-workspace', { wsName: 'missing' });

    await vi.waitFor(() => {
      expect(getCommandResults().at(-1)?.type).toBe('failure');
    });
    expect(picker).not.toHaveBeenCalled();
  });

  it('fails without opening a picker for a non-nativefs workspace', async () => {
    const { dispatch, services, getCommandResults } = await setupTest({
      targetId: 'command::ui:locate-native-fs-workspace',
      autoNavigate: false,
    });
    await services.workspaceOps.createWorkspaceInfo({
      name: 'browser-ws',
      type: WORKSPACE_STORAGE_TYPE.Browser,
      metadata: {},
    });
    const picker = vi.fn();
    vi.stubGlobal('showDirectoryPicker', picker);

    dispatch('command::ui:locate-native-fs-workspace', {
      wsName: 'browser-ws',
    });

    await vi.waitFor(() => {
      expect(getCommandResults().at(-1)?.type).toBe('failure');
    });
    expect(picker).not.toHaveBeenCalled();
  });

  it('fails without opening a picker when the stored handle is missing', async () => {
    const { dispatch, services, getCommandResults } = await setupTest({
      targetId: 'command::ui:locate-native-fs-workspace',
      autoNavigate: false,
    });
    await services.workspaceOps.createWorkspaceInfo({
      name: 'broken-ws',
      type: WORKSPACE_STORAGE_TYPE.NativeFS,
      metadata: {},
    });
    const picker = vi.fn();
    vi.stubGlobal('showDirectoryPicker', picker);

    dispatch('command::ui:locate-native-fs-workspace', { wsName: 'broken-ws' });

    await vi.waitFor(() => {
      expect(getCommandResults().at(-1)?.type).toBe('failure');
    });
    expect(picker).not.toHaveBeenCalled();
    expect(
      await services.workspaceOps.getWorkspaceMetadata('broken-ws'),
    ).toEqual({});
  });
});
