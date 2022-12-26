import React, { useCallback, useEffect, useState } from 'react';

import {
  useBangleStoreContext,
  useSerialOperationContext,
  workspace,
} from '@bangle.io/api';
import { lastWorkspaceUsed } from '@bangle.io/bangle-store';
import { CORE_OPERATIONS_NEW_WORKSPACE } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { goToWsNameRoute } from '@bangle.io/slice-workspace';
import {
  ButtonV2,
  CenteredBoxedPage,
  NewNoteIcon,
} from '@bangle.io/ui-components';

export function LandingPage() {
  const bangleStore = useBangleStoreContext();

  const [workspaces, updateWorkspaces] = useState<WorkspaceInfo[]>([]);

  useEffect(() => {
    let destroyed = false;
    workspace.readAllWorkspacesInfo().then((wsInfos) => {
      if (destroyed) {
        return;
      }
      updateWorkspaces(wsInfos);
    });

    return () => {
      destroyed = true;
    };
  }, [bangleStore]);

  const { dispatchSerialOperation } = useSerialOperationContext();

  const onClickWsName = useCallback(
    (wsName: string) => {
      goToWsNameRoute(wsName)(bangleStore.state, bangleStore.dispatch);
    },
    [bangleStore],
  );

  return (
    <CenteredBoxedPage
      title="Welcome to Bangle.io"
      actions={
        <>
          <ButtonV2
            ariaLabel="new workspace"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_WORKSPACE,
              });
            }}
            text="New workspace"
          />
        </>
      }
    >
      {workspaces.length !== 0 ? (
        <RecentWorkspace
          workspaces={workspaces}
          onClickWsName={onClickWsName}
        />
      ) : (
        <div className="mb-3">You do not have any workspaces</div>
      )}
    </CenteredBoxedPage>
  );
}

function RecentWorkspace({
  workspaces,
  onClickWsName,
}: {
  workspaces: WorkspaceInfo[];
  onClickWsName: (wsName: string) => void;
}) {
  const [lastWsName] = useState(() => {
    return lastWorkspaceUsed.get();
  });

  return (
    <div className="mb-3" data-test="landing-page">
      <div className="flex flex-row mt-6">
        <h3 className="mr-1 leading-none text-l sm:text-xl lg:text-xl">
          Workspaces
        </h3>
      </div>
      <ul className="my-2 ml-2 list-disc list-inside max-h-72 overflow-y-auto">
        {workspaces
          .sort((a, b) => {
            if (a.name === lastWsName) {
              return -1;
            }

            if (b.name === lastWsName) {
              return 1;
            }

            return a.name.localeCompare(b.name);
          })
          .map((r, i) => {
            return (
              <li key={i}>
                <button
                  role="link"
                  onClick={(e) => {
                    onClickWsName(r.name);
                  }}
                  className="py-1 hover:underline"
                >
                  <span>{r.name} </span>
                  {r.name === lastWsName && (
                    <span className="font-light italic text-colorNeutralTextSubdued">
                      (last opened)
                    </span>
                  )}
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
