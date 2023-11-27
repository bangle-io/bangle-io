import './style.css';

import { ActionGroup, Flex, Item, Text, Well } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import FolderAdd from '@spectrum-icons/workflow/FolderAdd';
import React from 'react';

import { getWindowStoreConfig } from '@bangle.io/lib-common';
import { WorkspaceInfo } from '@bangle.io/shared-types';
import { sliceUI } from '@bangle.io/slice-ui';

import { WorkspaceTable } from './WorkspaceTable';

export function MainContent() {
  const store = useStore();

  const { widescreen } = useTrack(sliceUI);

  const { eternalVars } = getWindowStoreConfig(store);

  const [workspaces, updateWorkspaces] = React.useState<
    WorkspaceInfo[] | undefined
  >(undefined);

  React.useEffect(() => {
    let destroyed = false;
    const workspacesProm = eternalVars.appDatabase.getAllWorkspaces();

    void workspacesProm.then((workspaces) => {
      if (destroyed) {
        return;
      }
      updateWorkspaces(workspaces);
    });
    return () => {
      destroyed = true;
    };
  }, [eternalVars]);

  return (
    <Flex
      direction="column"
      height="100%"
      gap="size-400"
      UNSAFE_className="overflow-y-scroll B-app-main-content mx-1 widescreen:px-4 py-4"
    >
      {/* <Well role="region" aria-labelledby="Welcome" marginTop="size-300">
        <Text UNSAFE_className="text-2xl">Welcome Back!</Text>
        <div>
          <Text UNSAFE_className="text-sm">Learn more about Bangle.io</Text>
        </div>
      </Well> */}
      <Flex direction="row" justifyContent="space-between" gap="size-100">
        <Text UNSAFE_className="text-2xl">Workspaces</Text>
        <ActionGroup alignSelf="center">
          <Item key="new-workspace">
            <FolderAdd />
            <Text>New</Text>
          </Item>
        </ActionGroup>
      </Flex>
      {workspaces && (
        <WorkspaceTable widescreen={widescreen} workspaces={workspaces} />
      )}
    </Flex>
  );
}
