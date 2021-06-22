import React, { useContext, useCallback, useState } from 'react';
import { pickADirectory } from 'baby-fs/index';
import { ListPalette, UniversalPalette, InputPalette } from 'ui-components';
import { FileOps, useWorkspaces } from 'workspaces';
import { useWorkspaceContext } from 'workspace-context';
import { UIManagerContext } from 'ui-context';

const deleteAllFiles = async (wsName) => {
  const files = await FileOps.listAllFiles(wsName);
  await Promise.all(files.map((w) => FileOps.deleteFile(w)));
};

export function NewWorkspaceInputModal({ resetWsName, onDismiss, clone }) {
  const [showLocalStorageOption, updateShowLocalStorage] = useState(false);
  const { createWorkspace } = useWorkspaces();
  const { dispatch } = useContext(UIManagerContext);
  const [error, updateError] = useState();
  const { wsName } = useWorkspaceContext();
  const { widescreen } = useContext(UIManagerContext);

  const onConfirm = useCallback(
    async (type, inputValue) => {
      let newWsName, rootDirHandle;
      try {
        if (type === 'nativefs') {
          rootDirHandle = await pickADirectory();
          newWsName = rootDirHandle.name;
          window.fathom?.trackGoal('K3NFTGWX', 0);
        } else if (type === 'browser') {
          newWsName = inputValue;
          window.fathom?.trackGoal('AISLCLRF', 0);
        } else {
          throw new Error('Unknown workspace type ' + type);
        }

        await createWorkspace(newWsName, type, {
          rootDirHandle,
          beforeHistoryChange: async () => {
            if (clone && wsName) {
              await FileOps.copyWorkspace(wsName, newWsName);
              if (resetWsName) {
                await deleteAllFiles(resetWsName);
              }
              dispatch({
                type: 'UI/SHOW_NOTIFICATION',
                value: {
                  severity: 'success',
                  uid: 'success-clone-' + wsName,
                  content: 'Successfully cloned ' + wsName + ' to ' + newWsName,
                },
              });
            }
          },
        });

        onDismiss();
      } catch (error) {
        updateError(error);
      }
    },
    [
      updateError,
      onDismiss,
      dispatch,
      clone,
      createWorkspace,
      resetWsName,
      wsName,
    ],
  );

  if (showLocalStorageOption === true) {
    return (
      <NewWorkspaceNameStage
        onDismiss={onDismiss}
        resetWsName={resetWsName}
        clone={clone}
        onConfirm={onConfirm}
        error={error}
        updateError={updateError}
        widescreen={widescreen}
      />
    );
  }

  return (
    <NewWorkspaceStorageStage
      onDismiss={onDismiss}
      resetWsName={resetWsName}
      clone={clone}
      updateShowLocalStorage={updateShowLocalStorage}
      onConfirm={onConfirm}
      error={error}
      updateError={updateError}
      widescreen={widescreen}
    />
  );
}

function NewWorkspaceStorageStage({
  onDismiss,
  updateShowLocalStorage,
  onConfirm,
  error,
  updateError,
  widescreen,
}) {
  return (
    <ListPalette
      widescreen={widescreen}
      error={error}
      updateError={updateError}
      placeholder="Select the storage type of your workspace"
      onDismiss={onDismiss}
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
            await onConfirm('nativefs');
          } else if (item.uid === 'browser') {
            updateShowLocalStorage(true);
          }
        }
      }}
    >
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          You are picking a storage type for your new workspace
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </ListPalette>
  );
}

function NewWorkspaceNameStage({
  widescreen,
  error,
  onDismiss,
  updateError,
  onConfirm,
}) {
  const onExecute = useCallback(
    async (inputValue) => {
      await onConfirm('browser', inputValue);
    },
    [onConfirm],
  );

  return (
    <InputPalette
      widescreen={widescreen}
      placeholder="Enter the name of your workspace"
      onExecute={onExecute}
      onDismiss={onDismiss}
      error={error}
      updateError={updateError}
    >
      <UniversalPalette.PaletteInfo>
        <UniversalPalette.PaletteInfoItem>
          You are providing a name for your workspace
        </UniversalPalette.PaletteInfoItem>
      </UniversalPalette.PaletteInfo>
    </InputPalette>
  );
}
