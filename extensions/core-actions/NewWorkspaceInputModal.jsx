import React, { useCallback, useState } from 'react';
import { InputModal } from './InputModal';
import { ListModal } from './ListModal';
import { pickADirectory } from 'baby-fs/index';
import { PaletteInfo, PaletteInfoItem } from 'ui-components';
import {
  deleteFile,
  listAllFiles,
  copyWorkspace,
  useWorkspaces,
} from 'workspaces';
import { useWorkspaceContext } from 'workspace-context';

const deleteAllFiles = async (wsName) => {
  const files = await listAllFiles(wsName);
  await Promise.all(files.map((w) => deleteFile(w)));
};

export function NewWorkspaceInputModal({ resetWsName, dismissModal, clone }) {
  const [showLocalStorageOption, updateShowLocalStorage] = useState(false);

  if (showLocalStorageOption === true) {
    return (
      <NewWorkspaceNameStage
        dismissModal={dismissModal}
        resetWsName={resetWsName}
        clone={clone}
      />
    );
  }

  return (
    <NewWorkspaceStorageStage
      dismissModal={dismissModal}
      resetWsName={resetWsName}
      clone={clone}
      onSelectBrowserStorage={async () => {
        updateShowLocalStorage(true);
      }}
    />
  );
}

function NewWorkspaceStorageStage({
  dismissModal,
  onSelectBrowserStorage,
  clone,
  resetWsName,
}) {
  const { createWorkspace } = useWorkspaces();
  const [error, updateError] = useState();
  const { wsName } = useWorkspaceContext();

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
                beforeHistoryChange: async () => {
                  if (clone && wsName) {
                    await copyWorkspace(wsName, rootDirHandle.name);
                    if (resetWsName) {
                      await deleteAllFiles(resetWsName);
                    }
                  }
                },
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

function NewWorkspaceNameStage({ dismissModal, clone, resetWsName }) {
  const { createWorkspace } = useWorkspaces();
  const [error, updateError] = useState();
  const { wsName } = useWorkspaceContext();

  const onExecute = useCallback(
    async (inputValue) => {
      if (!inputValue) {
        updateError(new Error('Must give workspace a name'));
        return;
      }
      try {
        await createWorkspace(inputValue, 'browser', {
          beforeHistoryChange: async () => {
            if (clone && wsName) {
              await copyWorkspace(wsName, inputValue);
              if (resetWsName) {
                await deleteAllFiles(resetWsName);
              }
            }
          },
        });
        window.fathom?.trackGoal('AISLCLRF', 0);
        dismissModal();
      } catch (error) {
        updateError(error);
      }
    },
    [createWorkspace, dismissModal, resetWsName, wsName, clone],
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
