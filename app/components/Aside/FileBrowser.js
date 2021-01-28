import './aside.css';
import React, { useCallback, useContext } from 'react';
import { SideBar } from './SideBar';
import { CollapsibleSideBarRow, SideBarRow } from './SideBarRow';
import { BaseButton } from '../Button';
import 'css.gg/icons/css/chevron-down.css';
import { ChevronDown, ChevronRight } from '../Icons/index';
import { EditorManagerContext } from 'bangle-io/app/workspace2/EditorManager';
import {
  useCreateNewFile,
  useDeleteByDocName,
  useGetWorkspaceFiles,
  useWorkspaceDetails,
} from 'bangle-io/app/workspace2/workspace-hooks';

FileBrowser.propTypes = {};

export function FileBrowser() {
  const [files] = useGetWorkspaceFiles();
  const createNewFile = useCreateNewFile();
  const deleteByDocName = useDeleteByDocName();
  const { dispatch } = useContext(EditorManagerContext);
  const { wsName, filePath, pushWsPath } = useWorkspaceDetails();

  const toggleTheme = () =>
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });

  const openNew = useCallback(() => {
    createNewFile();
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
  }, [dispatch, createNewFile]);

  return (
    <SideBar
      openNew={openNew}
      toggleTheme={toggleTheme}
      downloadBackup={() => {}}
    >
      <CollapsibleSideBarRow
        title={wsName}
        isSticky={true}
        leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
        activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
      >
        {files.map((item) => (
          <SideBarRow
            key={item.docName}
            onClick={() => {
              pushWsPath(wsName + ':' + item.docName);
            }}
            title={item.title}
            isActive={filePath === item.docName}
            rightIcon={[
              <BaseButton
                key="delete"
                className="text-gray-600 hover:text-gray-900"
                faType="fas fa-times-circle "
                onClick={async (e) => {
                  e.stopPropagation();
                  deleteByDocName(item.docName);
                  dispatch({
                    type: 'UI/TOGGLE_SIDEBAR',
                  });
                }}
              />,
            ]}
          />
        ))}
      </CollapsibleSideBarRow>
    </SideBar>
  );
}
