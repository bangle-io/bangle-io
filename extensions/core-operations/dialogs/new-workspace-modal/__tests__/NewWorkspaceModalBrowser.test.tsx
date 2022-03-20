/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { pickADirectory } from '@bangle.io/baby-fs';
import { CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE } from '@bangle.io/constants';
import { useSerialOperationContext } from '@bangle.io/serial-operation-context';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { hasWorkspace } from '@bangle.io/slice-workspace';
import { sleep } from '@bangle.io/utils';

import { WORKSPACE_NAME_ALREADY_EXISTS_ERROR } from '../common';
import { NewWorkspaceModal } from '../NewWorkspaceModal';

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

jest.mock('react-dom', () => {
  const otherThings = jest.requireActual('react-dom');

  return {
    ...otherThings,
    createPortal: jest.fn((element, node) => {
      return element;
    }),
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

describe('NewWorkspaceModalBrowser', () => {
  describe('browsers storage type', () => {
    test('renders correctly', () => {
      let result = render(
        <div>
          <NewWorkspaceModal />
        </div>,
      );

      expect(result.container).toMatchSnapshot();
    });

    test('renders workspace input when browser', () => {
      let result = render(
        <div>
          <NewWorkspaceModal />
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
          <NewWorkspaceModal />
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
          <NewWorkspaceModal />
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
});
