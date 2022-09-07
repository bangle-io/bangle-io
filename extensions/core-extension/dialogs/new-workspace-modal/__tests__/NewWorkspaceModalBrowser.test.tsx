/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';

import { useSerialOperationContext, workspace } from '@bangle.io/api';
import { pickADirectory } from '@bangle.io/baby-fs';
import { CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE } from '@bangle.io/constants';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { OverlayProvider } from '@bangle.io/ui-components';

import { WORKSPACE_NAME_ALREADY_EXISTS_ERROR } from '../common';
import { NewWorkspaceModal } from '../NewWorkspaceModal';

jest.mock('@react-aria/ssr/dist/main', () => {
  return {
    ...jest.requireActual('@react-aria/ssr/dist/main'),
    // react aria generates a bunch of random ids, this
    // makes the snapshot stable.
    useSSRSafeId: () => `react-aria-test-id`,
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
    readWorkspaceInfo: jest.fn(async () => undefined),
  };
});

jest.mock('@bangle.io/api', () => {
  const otherThings = jest.requireActual('@bangle.io/api');

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

const readWorkspaceInfoMock =
  workspace.readWorkspaceInfo as jest.MockedFunction<
    typeof workspace.readWorkspaceInfo
  >;

beforeEach(() => {
  let dispatchSerialOperation = jest.fn();

  readWorkspaceInfoMock.mockImplementation(async () => undefined);

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
        <OverlayProvider>
          <NewWorkspaceModal />
        </OverlayProvider>,
      );

      expect(result.container).toMatchSnapshot();
    });

    test('renders workspace input when browser', () => {
      let result = render(
        <div>
          <OverlayProvider>
            <NewWorkspaceModal />
          </OverlayProvider>
        </div>,
      );
      expect(result.getByLabelText('Select storage type').innerHTML).toContain(
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
          <OverlayProvider>
            <NewWorkspaceModal />
          </OverlayProvider>
        </div>,
      );

      expect(
        result.getByLabelText('Create workspace').hasAttribute('disabled'),
      ).toBe(true);

      await waitFor(() => {
        const input = result.getByLabelText('workspace name input');

        expect(input).toBeTruthy();
        fireEvent.change(input, { target: { value: 'my-test-ws' } });
      });

      expect(
        result.getByLabelText('Create workspace').hasAttribute('disabled'),
      ).toBe(false);

      act(() => {
        fireEvent.click(result.getByLabelText('Create workspace'));
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
      jest.useFakeTimers();

      readWorkspaceInfoMock.mockImplementation(async () => ({
        name: 'my-test-ws',
        type: 'browser',
        lastModified: 0,
        metadata: {},
      }));

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

      await waitFor(async () => {
        const input = result.getByLabelText('workspace name input');

        expect(input).toBeTruthy();
        fireEvent.change(input, { target: { value: 'my-existing-ws' } });
      });

      await act(async () => {
        jest.runAllTimers();
        await Promise.resolve();
      });

      expect(
        result.getByLabelText('Create workspace').hasAttribute('disabled'),
      ).toBe(true);

      expect(
        result.getByTestId(WORKSPACE_NAME_ALREADY_EXISTS_ERROR),
      ).toBeTruthy();

      expect(result.getByTestId(WORKSPACE_NAME_ALREADY_EXISTS_ERROR))
        .toMatchInlineSnapshot(`
        <div
          class="w-full m-1 px-5 py-3 text-center rounded"
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
