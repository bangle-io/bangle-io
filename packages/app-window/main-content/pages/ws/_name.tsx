import { ActionGroup, Flex, Item, Text } from '@adobe/react-spectrum';
import { useStore, useTrack } from '@nalanda/react';
import DeleteIcon from '@spectrum-icons/workflow/Delete';
import FolderAddIcon from '@spectrum-icons/workflow/FolderAdd';
import React, { useCallback, useEffect, useMemo } from 'react';

import { EditorComp } from '@bangle.io/editor';
import { slicePage } from '@bangle.io/slice-page';
import { APP_DIALOG_NAME, sliceUI } from '@bangle.io/slice-ui';
import { sliceWorkspace } from '@bangle.io/slice-workspace';
import { FilesTable, MainContentWrapper } from '@bangle.io/ui';
import { randomName } from '@bangle.io/utils';
import {
  locationHelpers,
  resolvePath,
  validateNoteWsPath,
} from '@bangle.io/ws-path';
interface FileActionsProps {
  disabledKeys: string[];
  onAction: (key: React.Key) => void;
}

enum ACTION_KEY {
  newFile = 'new-file',
  deleteFile = 'delete-file',
}

function FileActions({ disabledKeys, onAction }: FileActionsProps) {
  return (
    <ActionGroup
      alignSelf="center"
      items={[
        { key: ACTION_KEY.deleteFile, icon: <DeleteIcon />, label: 'Delete' },
        { key: ACTION_KEY.newFile, icon: <FolderAddIcon />, label: 'New' },
      ]}
      disabledKeys={disabledKeys}
      onAction={onAction}
    >
      {(item) => (
        <Item key={item.key}>
          {item.icon}
          <Text>{item.label}</Text>
        </Item>
      )}
    </ActionGroup>
  );
}
export default function PageWsName() {
  const { wsName, primaryWsPath } = useTrack(slicePage);
  const { workspace } = useTrack(sliceWorkspace);

  const readNote = useCallback(
    async (wsPath: string) => {
      return workspace?.readFileAsText(wsPath);
    },
    [workspace],
  );
  // if the path points to a file, then we show the editor
  if (wsName && primaryWsPath) {
    return (
      <MainContentWrapper>
        <EditorComp
          wsPath={primaryWsPath}
          readNote={readNote}
          writeNote={async (wsPath, content) => {
            const { fileName } = resolvePath(wsPath);
            void workspace?.createFile(
              wsPath,
              new File([content], fileName, {
                type: 'text/plain',
              }),
            );
          }}
        />
      </MainContentWrapper>
    );
  }

  return <PageWsAllFiles />;
}

function PageWsAllFiles() {
  const store = useStore();

  const { wsName } = useTrack(slicePage);

  const { allFiles, workspace } = useTrack(sliceWorkspace);
  const { widescreen } = useTrack(sliceUI);

  const [selectedWsKey, updateSelectedWsKey] = React.useState<
    string | undefined
  >(undefined);

  const items = React.useMemo(() => {
    return allFiles?.map((wsPath) => {
      const res = resolvePath(wsPath);
      return res;
    });
  }, [allFiles]);

  if (!wsName) {
    return null;
  }

  const createNote = () => {
    const name = randomName();
    const wsPath = wsName + ':' + name + '.md';

    validateNoteWsPath(wsPath);

    void workspace?.createFile(
      wsPath,
      new File(['I am content of ' + name], name, {
        type: 'text/plain',
      }),
    );
  };

  const handleAction = (key: React.Key | ACTION_KEY) => {
    switch (key) {
      case ACTION_KEY.newFile: {
        createNote();
        break;
      }
      case ACTION_KEY.deleteFile: {
        if (!selectedWsKey) {
          return;
        }

        store.dispatch(
          sliceUI.actions.showDialog(APP_DIALOG_NAME.fileConfirmDelete, {
            wsPath: selectedWsKey,
          }),
        );
        break;
      }
    }
  };

  const disabledKeys = selectedWsKey ? [] : [ACTION_KEY.deleteFile];

  return (
    <MainContentWrapper>
      <Flex direction="row" justifyContent="space-between" gap="size-100">
        <Text UNSAFE_className="text-2xl">Notes</Text>
        <FileActions disabledKeys={disabledKeys} onAction={handleAction} />
      </Flex>
      <FilesTable
        wsName={wsName}
        createNote={() => {
          createNote();
        }}
        goToWsPath={(wsPath) => {
          store.dispatch(
            slicePage.actions.goTo((location) =>
              locationHelpers.goToWsPath(location, wsPath),
            ),
          );
        }}
        selectedKey={selectedWsKey}
        updateSelectedKey={updateSelectedWsKey}
        widescreen={widescreen}
        wsPathsInfo={items}
      />
    </MainContentWrapper>
  );
}
