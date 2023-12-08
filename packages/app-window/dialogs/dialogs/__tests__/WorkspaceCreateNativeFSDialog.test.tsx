/**
 * @jest-environment @bangle.io/jsdom-env
 */
import { DialogContainer } from '@adobe/react-spectrum';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { TestProvider } from '@bangle.io/test-utils-react';
import { setupSliceTestStore } from '@bangle.io/test-utils-slice';

import {
  ERROR_TYPES,
  modalReducer,
  ModalState,
  ModalStateAction,
  ShowError,
  WorkspaceCreateErrorTypes,
  WorkspaceCreateNativeFSDialog,
} from '../WorkspaceCreateNativeFSDialog';

let abortController = new AbortController();

beforeEach(() => {
  abortController = new AbortController();
});

afterEach(() => {
  abortController.abort();
});

jest.mock('@bangle.io/baby-fs', () => {
  const original = jest.requireActual('@bangle.io/baby-fs');
  return {
    ...original,
    pickADirectory: jest.fn(async () => {
      return {
        name: 'test-dir',
      };
    }),
  };
});

describe('modalReducer', () => {
  const initialState: ModalState = {
    error: undefined,
    workspace: undefined,
  };

  it('should handle update_workspace', () => {
    const workspace = {
      name: 'Test Workspace',
      rootDir: {} as FileSystemDirectoryHandle,
    };
    const action: ModalStateAction = { type: 'update_workspace', workspace };
    const expectedState = { ...initialState, workspace };

    expect(modalReducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle update_error', () => {
    const error = 'ERROR_PICKING_DIRECTORY';
    const action: ModalStateAction = { type: 'update_error', error };
    const expectedState = { ...initialState, error };

    expect(modalReducer(initialState, action)).toEqual(expectedState);
  });

  it('should handle reset', () => {
    const action: ModalStateAction = { type: 'reset' };
    const modifiedState: ModalState = {
      error: 'WORKSPACE_AUTH_REJECTED',
      workspace: { name: 'Test', rootDir: {} as FileSystemDirectoryHandle },
    };

    expect(modalReducer(modifiedState, action)).toEqual(initialState);
  });
});

const errorTypes: WorkspaceCreateErrorTypes[] = Object.values(ERROR_TYPES);

errorTypes.forEach((errorType) => {
  it(`renders correctly for error type ${errorType}`, () => {
    render(<ShowError errorType={errorType} closeModal={() => {}} />);
    expect(screen.getByTestId(errorType)).toBeDefined();
  });
});

describe('dialog', () => {
  it('renders correctly', () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
    });

    render(
      <TestProvider store={ctx.store}>
        <DialogContainer onDismiss={() => {}}>
          <WorkspaceCreateNativeFSDialog />
        </DialogContainer>
      </TestProvider>,
    );
    expect(screen.getByText('Create New Workspace')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
    expect(screen.getByText('Create Workspace')).toBeDefined();
  });

  it('picks correctly', async () => {
    const ctx = setupSliceTestStore({
      abortSignal: abortController.signal,
    });

    render(
      <TestProvider store={ctx.store}>
        <DialogContainer onDismiss={() => {}}>
          <WorkspaceCreateNativeFSDialog />
        </DialogContainer>
      </TestProvider>,
    );

    fireEvent.click(screen.getByText('Select a Folder'));

    await waitFor(() => {
      expect(screen.getByText('test-dir')).toBeDefined();
    });

    // TODO: Implement this by using the store and eternal vars
    fireEvent.click(screen.getByText('Create Workspace'));

    const newWorkspaces = await ctx.appDatabase.getAllWorkspaces();

    expect(newWorkspaces.length).toEqual(1);
    expect(newWorkspaces?.[0]?.name).toEqual('test-dir');
    expect(newWorkspaces?.[0]).toEqual({
      name: 'test-dir',
      type: 'nativefs',
      deleted: false,
      lastModified: expect.any(Number),
      metadata: {
        rootDirHandle: {
          name: 'test-dir',
        },
      },
    });
  });
});
