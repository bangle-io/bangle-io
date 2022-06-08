/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  pickADirectory,
} from '@bangle.io/baby-fs';
import { CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE } from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { hasWorkspace } from '@bangle.io/slice-workspace';
import { OverlayProvider } from '@bangle.io/ui-components';

import { WORKSPACE_AUTH_REJECTED_ERROR } from '../common';
import { NewWorkspaceModal } from '../NewWorkspaceModal';

jest.mock('@react-aria/ssr/dist/main', () => {
  return {
    ...jest.requireActual('@react-aria/ssr/dist/main'),
    // react aria generates a bunch of random ids, this
    // makes the snapshot stable.
    useSSRSafeId: () => 'react-aria-test-id',
  };
});

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

jest.mock('../common', () => {
  const otherThings = jest.requireActual('../common');

  return {
    ...otherThings,
    defaultStorageType: otherThings.FILE_SYSTEM,
  };
});

jest.mock('@bangle.io/baby-fs', () => {
  const otherThings = jest.requireActual('@bangle.io/baby-fs');

  return {
    supportsNativeBrowserFs: jest.fn(() => false),

    ...otherThings,
    pickADirectory: jest.fn().mockResolvedValue({}),
  };
});

jest.mock('react-dom', () => {
  const otherThings = jest.requireActual('react-dom');

  return {
    ...otherThings,
    createPortal: jest.fn((element, node) => {
      return element;
    }),
  };
});
jest.mock('@bangle.io/slice-workspace', () => {
  const workspaceThings = jest.requireActual('@bangle.io/slice-workspace');

  return {
    ...workspaceThings,
    hasWorkspace: jest.fn(() => () => {}),
  };
});

jest.mock('@bangle.io/api', () => {
  const otherThings = jest.requireActual('@bangle.io/api');

  return {
    ...otherThings,
    useSerialOperationContext: jest.fn(() => ({})),
  };
});

const hasWorkspaceMock = hasWorkspace as jest.MockedFunction<
  typeof hasWorkspace
>;

beforeEach(() => {
  let dispatchSerialOperation = jest.fn();

  hasWorkspaceMock.mockImplementation(() => async () => false);

  (useUIManagerContext as any).mockImplementation(() => {
    const dispatch = jest.fn();

    return {
      dispatch: dispatch,
    };
  });

  (pickADirectory as any).mockResolvedValue({});

  (useSerialOperationContext as any).mockImplementation(() => {
    return { dispatchSerialOperation };
  });
});

describe('NewWorkspaceModalFileSystem', () => {
  test('renders correctly', async () => {
    let result = render(
      <div>
        <OverlayProvider>
          <NewWorkspaceModal />
        </OverlayProvider>
      </div>,
    );
    expect(result.getByLabelText('Select storage type').innerHTML).toContain(
      'File System',
    );

    expect(result.container).toMatchSnapshot();
  });

  test('allows switching of storage type', async () => {
    let result = render(
      <div>
        <OverlayProvider>
          <NewWorkspaceModal />
        </OverlayProvider>
      </div>,
    );

    expect(result.getByLabelText('Select storage type').innerHTML).toContain(
      'File System',
    );

    act(() => {
      fireEvent.click(result.getByLabelText('Select storage type'));
    });

    await waitFor(() => {
      const dropdown = result.getByRole('listbox');
      expect(dropdown).toBeTruthy();
    });

    expect(result.getAllByRole('option').map((r) => r.getAttribute('data-key')))
      .toMatchInlineSnapshot(`
      Array [
        "file-system",
        "browser",
      ]
    `);

    const browserOpt = result
      .getAllByRole('option')
      .find((r) => r.getAttribute('data-key') === 'browser');

    fireEvent.click(browserOpt!);

    expect(result.getByLabelText('Select storage type').innerHTML).toContain(
      'Browser',
    );
  });

  test('is able create a workspace', async () => {
    let dispatchSerialOperation = jest.fn();
    (useSerialOperationContext as any).mockImplementation(() => {
      return { dispatchSerialOperation };
    });

    (pickADirectory as any).mockResolvedValue({ name: 'test-dir-name' });

    let result = render(
      <div>
        <OverlayProvider>
          <NewWorkspaceModal />
        </OverlayProvider>
      </div>,
    );

    expect(
      result.getByLabelText('Create workspace').hasAttribute('disabled'),
    ).toBe(true);

    act(() => {
      fireEvent.click(result.getByLabelText('pick directory'));
    });

    await waitFor(() => {
      const dropdown = result.getByLabelText('pick directory');

      expect(dropdown.innerHTML).toContain('test-dir-name');
    });

    expect(pickADirectory).toBeCalledTimes(1);

    expect(
      result.getByLabelText('Create workspace').hasAttribute('disabled'),
    ).toBe(false);

    act(() => {
      fireEvent.click(result.getByLabelText('Create workspace'));
    });

    expect(dispatchSerialOperation).toBeCalledTimes(1);
    expect(dispatchSerialOperation).nthCalledWith(1, {
      name: CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
      value: {
        rootDirHandle: {
          name: 'test-dir-name',
        },
      },
    });
  });

  test('handles when fs throws error', async () => {
    let dispatchSerialOperation = jest.fn();
    (useSerialOperationContext as any).mockImplementation(() => {
      return { dispatchSerialOperation };
    });

    let error = new BaseFileSystemError({
      message: `Permission rejected `,
      code: NATIVE_BROWSER_PERMISSION_ERROR,
    });

    (pickADirectory as any).mockRejectedValue(error);

    let result = render(
      <div>
        <OverlayProvider>
          <NewWorkspaceModal />
        </OverlayProvider>
      </div>,
    );

    act(() => {
      fireEvent.click(result.getByLabelText('pick directory'));
    });

    await waitFor(() => {
      return result.getByTestId(WORKSPACE_AUTH_REJECTED_ERROR);
    });

    expect(result.getByTestId(WORKSPACE_AUTH_REJECTED_ERROR))
      .toMatchInlineSnapshot(`
        <div
          class="w-full px-4 text-center rounded"
          data-testid="WORKSPACE_AUTH_REJECTED"
          style="color: white;"
        >
          <div
            class="font-semibold text-left"
          >
            Bangle.io was denied access to your notes.
          </div>
          <div
            class="text-left"
          >
            <div>
              Please try again and press allow Bangle.io access to your locally saved notes.
            </div>
          </div>
        </div>
      `);

    expect(
      result.getByLabelText('Create workspace').hasAttribute('disabled'),
    ).toBe(true);
  });

  test('is able to resume after fs error', async () => {
    let dispatchSerialOperation = jest.fn();
    (useSerialOperationContext as any).mockImplementation(() => {
      return { dispatchSerialOperation };
    });

    let error = new BaseFileSystemError({
      message: `Permission rejected `,
      code: NATIVE_BROWSER_PERMISSION_ERROR,
    });

    (pickADirectory as any)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ name: 'test-dir-name' });

    let result = render(
      <div>
        <OverlayProvider>
          <NewWorkspaceModal />
        </OverlayProvider>
      </div>,
    );

    act(() => {
      fireEvent.click(result.getByLabelText('pick directory'));
    });

    await waitFor(() => {
      return result.getByTestId(WORKSPACE_AUTH_REJECTED_ERROR);
    });

    expect(pickADirectory).toBeCalledTimes(1);

    expect(
      result.getByLabelText('Create workspace').hasAttribute('disabled'),
    ).toBe(true);

    act(() => {
      fireEvent.click(result.getByLabelText('pick directory'));
    });

    await waitFor(() => {
      return result
        .getByLabelText('pick directory')
        .innerHTML.includes('test-dir-name');
    });

    expect(pickADirectory).toBeCalledTimes(2);

    expect(
      result.getByLabelText('Create workspace').hasAttribute('disabled'),
    ).toBe(false);
  });
});
