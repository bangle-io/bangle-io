import React, { useCallback, useState } from 'react';
import { useWorkspaces } from 'workspace/index';
import { InputModal } from './InputModal';
import { ListModal } from './ListModal';
import { pickADirectory } from 'baby-fs/index';
import { PaletteInfo, PaletteInfoItem } from 'ui-components';

export function NewWorkspaceInputModal({ dismissModal }) {
  const [showLocalStorageOption, updateShowLocalStorage] = useState(false);

  if (showLocalStorageOption === true) {
    return <NewWorkspaceNameStage dismissModal={dismissModal} />;
  }

  return (
    <NewWorkspaceStorageStage
      dismissModal={dismissModal}
      onSelectBrowserStorage={async () => {
        updateShowLocalStorage(true);
      }}
    />
  );
}

function NewWorkspaceStorageStage({ dismissModal, onSelectBrowserStorage }) {
  const { createWorkspace } = useWorkspaces();
  const [error, updateError] = useState();

  return (
    <ListModal
      error={error}
      updateError={updateError}
      placeholder="Select the storage type of your workspace"
      dismissModal={dismissModal}
      items={[
        {
          uid: 'nativefs',
          title: 'Your computer',
          extraInfo: 'recommended',
          description:
            'You will be asked to select a folder from your filesystem where Bangle.io will save all your markdown notes.',
        },
        {
          uid: 'browser',
          title: 'Browser',
          description:
            'Selecting this will make Bangle.io save notes in your browser storage.',
        },
      ]}
      onSelectItem={async (item) => {
        if (item) {
          if (item.uid === 'nativefs') {
            try {
              const rootDirHandle = await pickADirectory();
              await createWorkspace(rootDirHandle.name, 'nativefs', {
                rootDirHandle,
              });

              dismissModal();
            } catch (error) {
              updateError(error);
            }
          } else if (item.uid === 'browser') {
            onSelectBrowserStorage();
          }
        }
      }}
    >
      <PaletteInfo>
        <PaletteInfoItem>
          You are picking a storage type for your new workspace
        </PaletteInfoItem>
      </PaletteInfo>
    </ListModal>
  );
}

function NewWorkspaceNameStage({ dismissModal, onDone }) {
  const { createWorkspace } = useWorkspaces();
  const [error, updateError] = useState();
  const onExecute = useCallback(
    async (inputValue) => {
      if (!inputValue) {
        updateError(new Error('Must give workspace a name'));
        return;
      }
      try {
        await createWorkspace(inputValue, 'browser');
        window.fathom?.trackGoal('AISLCLRF', 0);
        dismissModal();
      } catch (error) {
        updateError(error);
      }
    },
    [createWorkspace, dismissModal],
  );

  return (
    <InputModal
      placeholder="Enter the name of your workspace"
      onExecute={onExecute}
      dismissModal={dismissModal}
      updateError={updateError}
      error={error}
    >
      <PaletteInfo>
        <PaletteInfoItem>
          You are providing a name for your workspace
        </PaletteInfoItem>
      </PaletteInfo>
    </InputModal>
  );
}
