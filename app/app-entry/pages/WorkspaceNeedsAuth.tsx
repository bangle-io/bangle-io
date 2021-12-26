import React, { useEffect, useState } from 'react';
import { Redirect, useHistory, useParams } from 'react-router-dom';

import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CenteredBoxedPage } from '@bangle.io/ui-components';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { keybindingsHelper } from '@bangle.io/utils';
import {
  getWorkspaceInfo,
  WORKSPACE_NOT_FOUND_ERROR,
  WorkspaceError,
} from '@bangle.io/workspaces';

export function WorkspaceNativefsAuthBlockade({ onWorkspaceNotFound }) {
  const [permissionDenied, updatePermissionDenied] = useState(false);
  const history = useHistory();
  const { wsName } = useParams();

  const onGranted = () => {
    const previousLocation = history.location?.state?.previousLocation;
    if (previousLocation) {
      history.replace(previousLocation);
    } else {
      history.replace({
        pathname: '/ws/' + wsName,
      });
    }
  };
  const requestFSPermission = async () => {
    let workspace;
    try {
      workspace = await getWorkspaceInfo(wsName);
    } catch (error) {
      if (
        error instanceof WorkspaceError &&
        error.code === WORKSPACE_NOT_FOUND_ERROR
      ) {
        onWorkspaceNotFound(wsName, history);
      }
      throw error;
    }
    if (!workspace) {
      throw new Error('workspace not found');
    }
    if (workspace.type !== 'nativefs') {
      onGranted();
      return true;
    }
    const result = await requestNativeBrowserFSPermission(
      workspace.metadata.rootDirHandle,
    );
    if (result) {
      onGranted();
      return true;
    } else {
      updatePermissionDenied(true);
      return false;
    }
  };

  if (!wsName) {
    return (
      <Redirect
        to={{
          pathname: '/',
        }}
      />
    );
  }

  return (
    <PermissionModal
      permissionDenied={permissionDenied}
      requestFSPermission={requestFSPermission}
      wsName={wsName}
    />
  );
}

function PermissionModal({ permissionDenied, requestFSPermission, wsName }) {
  const { paletteType, modal } = useUIManagerContext();
  const isPaletteActive = Boolean(paletteType);
  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        if (isPaletteActive || modal) {
          return false;
        }
        requestFSPermission();
        return true;
      },
    });
    document.addEventListener('keydown', callback);
    return () => {
      document.removeEventListener('keydown', callback);
    };
  }, [requestFSPermission, isPaletteActive, modal]);

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <WorkspaceSpan
            wsName={wsName}
            emoji={permissionDenied ? '❌' : '📖'}
          />
          <span className="pl-1">
            {permissionDenied ? 'permission denied' : 'requires permission'}
          </span>
        </span>
      }
      actions={
        <ActionButton
          ariaLabel="grant disk read permission"
          onPress={() => {
            requestFSPermission();
          }}
        >
          <ButtonContent
            text={
              <>
                <span>Grant permission {'[Enter]'}</span>
              </>
            }
          />
        </ActionButton>
      }
    >
      <span>
        Bangle.io needs permission to access your locally saved notes.
      </span>
    </CenteredBoxedPage>
  );
}

export function WorkspaceSpan({
  wsName,
  emoji = '📖',
}: {
  wsName: string;
  emoji?: string;
}) {
  return (
    <>
      <span className="font-normal">
        {emoji} Workspace <span className="font-bold">{wsName}</span>
      </span>
    </>
  );
}
