import React from 'react';

import { vars } from '@bangle.io/atomic-css';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { CorePalette } from '@bangle.io/constants';
import { togglePaletteType } from '@bangle.io/slice-ui';
import { safeRequestAnimationFrame } from '@bangle.io/utils';

import type { WorkspaceCreateErrorTypes } from './common';
import {
  CLICKED_TOO_SOON_ERROR,
  ERROR_PICKING_DIRECTORY_ERROR,
  INVALID_WORKSPACE_NAME_ERROR,
  UNKNOWN_ERROR,
  WORKSPACE_AUTH_REJECTED_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
} from './common';

export function ShowError({
  errorType,
  closeModal,
}: {
  errorType: WorkspaceCreateErrorTypes | undefined;
  closeModal: () => void;
}) {
  const bangleStore = useBangleStoreContext();

  if (!errorType) {
    return null;
  }

  let content, title;

  switch (errorType) {
    case WORKSPACE_NAME_ALREADY_EXISTS_ERROR: {
      title = 'A workspace with the same name already exists.';
      content = (
        <div>
          <button
            className="underline"
            onClick={() => {
              closeModal();
              safeRequestAnimationFrame(() => {
                togglePaletteType(CorePalette.Workspace)(
                  bangleStore.state,
                  bangleStore.dispatch,
                );
              });
            }}
          >
            Click here
          </button>{' '}
          to open it
        </div>
      );
      break;
    }

    case ERROR_PICKING_DIRECTORY_ERROR: {
      title = 'There was an error opening your notes folder.';
      content = (
        <div>
          Please make sure your notes folder inside a common location like
          Documents or Desktop.
        </div>
      );
      break;
    }

    case CLICKED_TOO_SOON_ERROR: {
      title = 'That didn’t work';
      content = <div>Please try clicking the Browse button again.</div>;
      break;
    }
    case INVALID_WORKSPACE_NAME_ERROR: {
      title = 'Invalid workspace name';
      content = (
        <div>
          Workspace cannot have <code>:</code> in its name.
        </div>
      );
      break;
    }
    case WORKSPACE_AUTH_REJECTED_ERROR: {
      title = 'Bangle.io was denied access to your notes.';
      content = (
        <div>
          Please try again and press <i>allow</i> to let Bangle.io access your
          locally saved notes.
        </div>
      );
      break;
    }
    case UNKNOWN_ERROR: {
      title = 'An unknown error occurred.';
      content = (
        <div>
          Please reload window and try again. If the problem still persists open
          an issue at{' '}
          <a
            href="https://github.com/bangle-io/bangle-io/issues"
            className="underline"
          >
            Github
          </a>{' '}
        </div>
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
      className="w-full m-1 px-5 py-3 text-center rounded"
      data-testid={errorType}
      style={{
        backgroundColor: vars.color.critical.solidFaint,
        color: vars.color.critical.solidText,
      }}
    >
      <div className="font-semibold text-left">{title}</div>
      <div className="text-left">{content}</div>
    </div>
  );
}
