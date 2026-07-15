// @vitest-environment jsdom
import { getAppErrorCause } from '@bangle.io/base-utils';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import type { BaseError } from '@bangle.io/mini-js-utils';
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
    permissionRequests.length = 0;
  });

  const permissionRequests: string[] = [];

  // Passes the isFileSystemDirectoryHandle guard the handler applies to
  // metadata restored from untyped storage, while staying structured-clone
  // safe: workspace writes broadcast their change events via structuredClone,
  // which rejects own function properties (so no vi.fn()/spyOn on instances).
  // Class methods live on the prototype and survive; calls are tracked in
  // `permissionRequests` instead.
  class StoredDirHandle {
    readonly kind = 'directory';
    constructor(readonly name: string) {}
    async requestPermission(): Promise<PermissionState> {
      permissionRequests.push(this.name);
      return 'granted';
    }
  }
  const makeStoredHandle = (name: string) => new StoredDirHandle(name);

  // The exact app-error name matters: locate-failed is classified as handled
  // (non-reportable) by shouldReportAppError, unlike a generic failure.
  const emittedAppErrorNames = (testEnv: {
    commonOpts: { emitAppError: (error: BaseError) => void };
  }) =>
    vi
      .mocked(testEnv.commonOpts.emitAppError)
      .mock.calls.map(([error]) => getAppErrorCause(error)?.name);

  it('anchors the picker at the stored handle and leaves everything unchanged', async () => {
    const { dispatch, services, getCommandResults, testEnv } = await setupTest({
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
    // Reveal-only: the selection is discarded, requestPermission is never
    // invoked on either handle, and the stored metadata is untouched.
    expect(permissionRequests).toEqual([]);
    expect(await services.workspaceOps.getWorkspaceMetadata('test-ws')).toEqual(
      { rootDirHandle: storedHandle },
    );
    expect(emittedAppErrorNames(testEnv)).toEqual([]);
  });

  it('treats cancelling the dialog as a successful reveal', async () => {
    const { dispatch, services, getCommandResults, testEnv } = await setupTest({
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
    // Cancelling is the expected way to close the reveal: no error surfaces.
    expect(emittedAppErrorNames(testEnv)).toEqual([]);
  });

  it('fails without opening a picker when the workspace does not exist', async () => {
    const { dispatch, getCommandResults, testEnv } = await setupTest({
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
    expect(emittedAppErrorNames(testEnv)).toEqual([
      'error::workspace:not-found',
    ]);
  });

  it('fails without opening a picker for a non-nativefs workspace', async () => {
    const { dispatch, services, getCommandResults, testEnv } = await setupTest({
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
    expect(emittedAppErrorNames(testEnv)).toEqual([
      'error::workspace:not-found',
    ]);
  });

  it('fails without opening a picker when the stored handle is missing', async () => {
    const { dispatch, services, getCommandResults, testEnv } = await setupTest({
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
    // A broken handle is an expected degraded state, surfaced as the handled
    // locate-failed error rather than a reportable defect.
    expect(emittedAppErrorNames(testEnv)).toEqual([
      'error::workspace:native-fs-locate-failed',
    ]);
  });
});
