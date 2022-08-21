import React, { useEffect, useState } from 'react';

import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import { WorkspaceTypeNative } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import {
  goToWorkspaceHomeRoute,
  goToWsNameRoute,
  goToWsNameRouteNotFoundRoute,
  readWorkspaceInfo,
} from '@bangle.io/slice-workspace';
import { ActionButton, ButtonContent } from '@bangle.io/ui-bangle-button';
import { CenteredBoxedPage } from '@bangle.io/ui-components';
import { keybindingsHelper } from '@bangle.io/utils';

export function WorkspaceNativefsAuthBlockade({ wsName }: { wsName: string }) {
  wsName = decodeURIComponent(wsName || '');

  const [permissionDenied, updatePermissionDenied] = useState(false);
  const bangleStore = useBangleStoreContext();
  const [wsInfo, updateWsInfo] = useState<WorkspaceInfo>();

  useEffect(() => {
    let destroyed = false;

    readWorkspaceInfo(wsName).then(
      (wsInfo) => {
        if (destroyed) {
          return;
        }
        if (!wsInfo) {
          goToWsNameRouteNotFoundRoute(wsName)(
            bangleStore.state,
            bangleStore.dispatch,
          );
        } else {
          updateWsInfo(wsInfo);
        }
      },
      (error) => {
        if (destroyed) {
          return;
        }
        bangleStore.errorHandler(error);
      },
    );

    return () => {
      destroyed = true;
    };
  }, [wsName, bangleStore]);

  const onGranted = () => {
    goToWsNameRoute(wsName, { replace: true })(
      bangleStore.state,
      bangleStore.dispatch,
    );
  };

  const requestFSPermission = async () => {
    if (!wsInfo) {
      throw new Error('workspace not found');
    }
    if (wsInfo.type !== WorkspaceTypeNative) {
      onGranted();

      return true;
    }
    const result = await requestNativeBrowserFSPermission(
      wsInfo.metadata.rootDirHandle,
    );

    if (result) {
      onGranted();

      return true;
    } else {
      updatePermissionDenied(true);

      return false;
    }
  };

  useEffect(() => {
    if (!wsName) {
      goToWorkspaceHomeRoute()(bangleStore.state, bangleStore.dispatch);
    }
  }, [bangleStore, wsName]);

  if (!wsName || !wsInfo) {
    return null;
  }

  return (
    <PermissionModal
      permissionDenied={permissionDenied}
      requestFSPermission={requestFSPermission}
      wsName={wsName}
    />
  );
}

function PermissionModal({
  permissionDenied,
  requestFSPermission,
  wsName,
}: {
  permissionDenied: boolean;
  requestFSPermission: () => Promise<boolean>;
  wsName: string;
}) {
  const { paletteType, dialogName } = useUIManagerContext();
  const isPaletteActive = Boolean(paletteType);
  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        if (isPaletteActive || dialogName) {
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
  }, [requestFSPermission, isPaletteActive, dialogName]);

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
