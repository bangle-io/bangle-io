// @vitest-environment jsdom
/// <reference types="@vitest/browser/matchers" />
import '@testing-library/jest-dom/vitest';
import { WORKSPACE_STORAGE_TYPE } from '@bangle.io/constants';
import { renderWithServices } from '@bangle.io/test-utils';
import { screen } from '@testing-library/react';
import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PageWelcome } from '../page-welcome';

describe('PageWelcome', () => {
  it('renders welcome message and empty state', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();

    testRender.mountComponent({ ui: <PageWelcome />, services });

    expect(
      screen.getByText(/Create a workspace to get started./i),
    ).toBeInTheDocument();
  });

  it('displays multiple workspaces in correct order with proper links', async () => {
    const testRender = renderWithServices();
    const services = await testRender.autoMountServices();

    // Create workspaces
    await act(async () => {
      await services.workspaceOps.createWorkspaceInfo({
        name: 'workspace1',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
      await services.workspaceOps.createWorkspaceInfo({
        name: 'workspace2',
        type: WORKSPACE_STORAGE_TYPE.Memory,
        metadata: {},
      });
    });

    // Navigate to establish order (workspace2 should be more recent)
    act(() => {
      services.navigation.goWorkspace('workspace1');
    });

    await vi.waitFor(() => {
      expect(services.workspaceState.resolveAtoms().workspaces).toHaveLength(2);
    });

    act(() => {
      services.navigation.goHome();
    });

    const { result } = testRender.mountComponent({
      ui: <PageWelcome />,
      services,
    });

    // Verify both workspaces are shown with correct links
    const items = result
      .getAllByRole('link')
      .map((item) => item.getAttribute('href'));

    expect(items.sort()).toMatchInlineSnapshot(`
      [
        "/memory/%7B%22route%22%3A%22welcome%22%2C%22payload%22%3A%7B%7D%7D",
        "/memory/%7B%22route%22%3A%22ws-home%22%2C%22payload%22%3A%7B%22wsName%22%3A%22workspace1%22%7D%7D",
        "/memory/%7B%22route%22%3A%22ws-home%22%2C%22payload%22%3A%7B%22wsName%22%3A%22workspace2%22%7D%7D",
        "https://bangle.io",
      ]
    `);
  });
});
