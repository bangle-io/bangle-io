// @vitest-environment jsdom
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { act, cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handlePwaLaunchTarget } from '../pwa-install';
import { PwaLaunchActions } from '../pwa-launch-actions';

describe('PwaLaunchActions wiring', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not navigate or open the create dialog from an incomplete recency read', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await services.workspaceOps.createWorkspaceInfo({
      name: 'fallback-workspace',
      type: WORKSPACE_STORAGE_TYPE.Memory,
      metadata: {},
    });
    await vi.waitFor(() => {
      expect(services.workspaceState.resolveAtoms().workspaces).toHaveLength(1);
    });

    const failure = new Error('recent activity unavailable');
    const recentRead = vi
      .spyOn(services.userActivityService, 'readRecentWsPathsAcrossWorkspaces')
      .mockResolvedValue({
        status: 'incomplete',
        recentWsPaths: [],
        failures: [
          {
            scope: 'workspace-activity',
            workspaceName: 'fallback-workspace',
            error: failure,
          },
        ],
      });
    const dispatch = vi.spyOn(services.commandDispatcher, 'dispatch');
    const goWorkspace = vi.spyOn(services.navigation, 'goWorkspace');
    testRender.mountComponent({ ui: <PwaLaunchActions /> });

    act(() => {
      handlePwaLaunchTarget(
        window,
        new URL('/?shortcut=new-note', window.location.origin).href,
      );
    });

    await vi.waitFor(() => {
      expect(recentRead).toHaveBeenCalledOnce();
    });
    expect(goWorkspace).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith(
      'command::ui:create-note-dialog',
      expect.anything(),
      expect.anything(),
    );
  });
});
