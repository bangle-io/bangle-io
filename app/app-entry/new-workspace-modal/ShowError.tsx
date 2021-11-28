import React from 'react';

import { useActionContext } from '@bangle.io/action-context';
import { CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE } from '@bangle.io/constants';
import { safeRequestAnimationFrame } from '@bangle.io/utils';

import {
  ERROR_PICKING_DIRECTORY_ERROR,
  INVALID_WORKSPACE_NAME_ERROR,
  UNKNOWN_ERROR,
  WORKSPACE_AUTH_REJECTED_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
  WorkspaceCreateErrorTypes,
} from './common';

export function ShowError({
  errorType,
  closeModal,
}: {
  errorType: WorkspaceCreateErrorTypes | undefined;
  closeModal: () => void;
}) {
  const { dispatchAction } = useActionContext();
  if (!errorType) {
    return null;
  }

  let content;

  switch (errorType) {
    case WORKSPACE_NAME_ALREADY_EXISTS_ERROR: {
      content = (
        <span>
          A workspace with the same name already exists.{' '}
          <button
            className="underline"
            onClick={() => {
              closeModal();
              safeRequestAnimationFrame(() => {
                dispatchAction({
                  name: CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
                });
              });
            }}
          >
            Click here
          </button>{' '}
          to open it
        </span>
      );
      break;
    }

    case ERROR_PICKING_DIRECTORY_ERROR: {
      content = (
        <span>
          There was an error opening your notes folder. Please make sure your
          notes folder inside a common location like Documents or Desktop.
        </span>
      );
      break;
    }
    case INVALID_WORKSPACE_NAME_ERROR: {
      content = (
        <span>
          Invalid workspace name. Workspace cannot have <code>:</code> in its
          name.
        </span>
      );
      break;
    }
    case WORKSPACE_AUTH_REJECTED_ERROR: {
      content = (
        <span>
          Bangle.io was denied access to your notes. Please try again and press
          allow Bangle.io access to your locally saved notes.
        </span>
      );
      break;
    }
    case UNKNOWN_ERROR: {
      content = (
        <span>
          An unknown error occurred. Please reload window and try again. If the
          problem still persists open an issue at{' '}
          <a
            href="https://github.com/bangle-io/bangle-io-issues"
            className="underline"
          >
            Github
          </a>{' '}
        </span>
      );
      break;
    }

    default: {
      // hack to catch switch slipping
      let val: never = errorType;
      throw new Error('Unknown error type ' + val);
    }
  }

  return (
    <div
      className="w-full px-4 text-center"
      data-testid={errorType}
      style={{
        backgroundColor: 'var(--severity-error-color)',
        color: 'white',
      }}
    >
      {content}
    </div>
  );
}
