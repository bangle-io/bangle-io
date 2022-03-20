/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import {
  BaseFileSystemError,
  NATIVE_BROWSER_PERMISSION_ERROR,
  pickADirectory,
  supportsNativeBrowserFs,
} from '@bangle.io/baby-fs';
import {
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
} from '@bangle.io/constants';
import { useSerialOperationContext } from '@bangle.io/serial-operation-context';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { hasWorkspace } from '@bangle.io/slice-workspace';
import { sleep } from '@bangle.io/utils';

import {
  WORKSPACE_AUTH_REJECTED_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
} from '../common';
import { NewWorkspaceModalContainer } from '../NewWorkspaceModal';

jest.mock('@bangle.io/slice-ui', () => {
  const otherThings = jest.requireActual('@bangle.io/slice-ui');

  return {
    ...otherThings,
    useUIManagerContext: jest.fn(() => ({})),
  };
});

jest.mock('@bangle.io/baby-fs', () => {
  const otherThings = jest.requireActual('@bangle.io/baby-fs');

  return {
    ...otherThings,
    supportsNativeBrowserFs: jest.fn(() => false),
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

jest.mock('@bangle.io/serial-operation-context', () => {
  const otherThings = jest.requireActual('@bangle.io/serial-operation-context');

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

  (supportsNativeBrowserFs as any).mockImplementation(() => {
    return false;
  });

  (pickADirectory as any).mockResolvedValue({});

  (useSerialOperationContext as any).mockImplementation(() => {
    return { dispatchSerialOperation };
  });
});

describe('NewWorkspaceModalContainer', () => {
  describe('browsers storage type', () => {
    test('renders correctly', () => {
      let result = render(
        <div>
          <NewWorkspaceModalContainer />
        </div>,
      );

      expect(result.container).toMatchSnapshot();
    });

    test('renders workspace input when browser', () => {
      let result = render(
        <div>
          <NewWorkspaceModalContainer />
        </div>,
      );
      expect(result.getByLabelText('select storage type').innerHTML).toContain(
        'Browser',
      );
    });

    test('is able create a workspace', async () => {
      let dispatchSerialOperation = jest.fn();
      (useSerialOperationContext as any).mockImplementation(() => {
        return { dispatchSerialOperation };
      });

      let result = render(
        <div>
          <NewWorkspaceModalContainer />
        </div>,
      );

      expect(
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(true);

      await waitFor(() => {
        const input = result.getByLabelText('workspace name input');

        expect(input).toBeTruthy();
        fireEvent.change(input, { target: { value: 'my-test-ws' } });
      });

      expect(
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(false);

      act(() => {
        fireEvent.click(result.getByLabelText('create workspace'));
      });

      expect(dispatchSerialOperation).toBeCalledTimes(1);
      expect(dispatchSerialOperation).nthCalledWith(1, {
        name: CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
        value: {
          wsName: 'my-test-ws',
        },
      });
    });

    test('shows error if name already exists', async () => {
      hasWorkspaceMock.mockImplementation(() => async () => true);

      let result = render(
        <div>
          <NewWorkspaceModalContainer />
        </div>,
      );

      expect(
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(true);

      await waitFor(async () => {
        const input = result.getByLabelText('workspace name input');

        expect(input).toBeTruthy();
        fireEvent.change(input, { target: { value: 'my-existing-ws' } });
        await sleep(10);
      });

      expect(
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(true);

      expect(
        result.getByTestId(WORKSPACE_NAME_ALREADY_EXISTS_ERROR),
      ).toBeTruthy();

      expect(result.getByTestId(WORKSPACE_NAME_ALREADY_EXISTS_ERROR))
        .toMatchInlineSnapshot(`
        <div
          class="w-full px-4 text-center rounded"
          data-testid="WORKSPACE_NAME_ALREADY_EXISTS"
          style="color: white;"
        >
          <div
            class="font-semibold text-left"
          >
            A workspace with the same name already exists.
          </div>
          <div
            class="text-left"
          >
            <div>
              <button
                class="underline"
              >
                Click here
              </button>
               
              to open it
            </div>
          </div>
        </div>
      `);
    });
  });

  describe('file-system storage type', () => {
    beforeEach(() => {
      (supportsNativeBrowserFs as any).mockImplementation(() => {
        return true;
      });
    });

    test('renders correctly', () => {
      let result = render(
        <div>
          <NewWorkspaceModalContainer />
        </div>,
      );
      expect(result.getByLabelText('select storage type').innerHTML).toContain(
        'File system',
      );

      expect(result.container).toMatchSnapshot();
    });

    test('allows switching of storage type', async () => {
      let result = render(
        <div>
          <NewWorkspaceModalContainer />
        </div>,
      );

      expect(result.getByLabelText('select storage type').innerHTML).toContain(
        'File system',
      );

      act(() => {
        fireEvent.click(result.getByLabelText('select storage type'));
      });

      await waitFor(() => {
        const dropdown = result.getAllByLabelText('storage type dropdown');

        expect(dropdown).toBeTruthy();

        fireEvent.click(result.getByLabelText('browser storage type'));
      });

      expect(result.getByLabelText('select storage type').innerHTML).toContain(
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
          <NewWorkspaceModalContainer />
        </div>,
      );

      expect(
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(true);

      act(() => {
        fireEvent.click(result.getByLabelText('pick directory'));
      });

      await waitFor(() => {
        const dropdown = result.getByLabelText('pick directory');

        expect(dropdown?.innerHTML).toContain('test-dir-name');
      });

      expect(pickADirectory).toBeCalledTimes(1);

      expect(
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(false);

      act(() => {
        fireEvent.click(result.getByLabelText('create workspace'));
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
          <NewWorkspaceModalContainer />
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
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
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
          <NewWorkspaceModalContainer />
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
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
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
        result.getByLabelText('create workspace')?.hasAttribute('disabled'),
      ).toBe(false);
    });
  });
});
