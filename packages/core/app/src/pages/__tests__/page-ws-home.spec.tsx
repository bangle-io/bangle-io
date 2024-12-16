// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { screen } from '@testing-library/react';
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PageWsHome } from '../page-ws-home';

describe('PageWsHome', () => {
  it('shows empty state if no notes', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'myWorkspace',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
    });

    testRender.mountComponent({ ui: <PageWsHome />, services });

    act(() => {
      services.navigation.goWorkspace('myWorkspace');
    });

    await vi.waitFor(() => {
      expect(
        services.workspaceState.resolveAtoms().currentWsName,
      ).toBeDefined();
    });

    expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
  });

  it('shows recently and all notes if available ', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'myWorkspace',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
      services.commandDispatcher.dispatch(
        'command::ws:create-note',
        {
          wsPath: 'myWorkspace:note1.md',
          navigate: undefined,
        },
        'test',
      );
      services.commandDispatcher.dispatch(
        'command::ws:create-note',
        {
          wsPath: 'myWorkspace:note2.md',
          navigate: undefined,
        },
        'test',
      );
      services.commandDispatcher.dispatch(
        'command::ws:go-workspace',
        {
          wsName: 'myWorkspace',
        },
        'test',
      );
    });

    await vi.waitFor(() => {
      expect(services.workspaceState.resolveAtoms().wsPaths).toHaveLength(2);
      expect(
        services.workspaceState.resolveAtoms().currentWsName,
      ).toBeDefined();
    });

    testRender.mountComponent({ ui: <PageWsHome />, services });

    expect(screen.getByText('note1.md')).toBeInTheDocument();
    expect(screen.getByText('note2.md')).toBeInTheDocument();
  });
});
