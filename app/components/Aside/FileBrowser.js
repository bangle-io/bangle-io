import './aside.css';
import React, { useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { SideBar } from './SideBar';
import { CollapsibleSideBarRow, SideBarRow } from './SideBarRow';
import { BaseButton } from '../Button';
import 'css.gg/icons/css/chevron-down.css';
import { ChevronDown, ChevronRight } from '../Icons/index';
import {
  workspaceActions,
  WorkspaceContext,
} from '../../workspace/WorkspaceContext';
import { EditorManagerContext } from 'bangle-io/app/workspace2/EditorManager';
import { useGetWorkspaceFiles } from 'bangle-io/app/workspace2/Workspace';

FileBrowser.propTypes = {
  toggleTheme: PropTypes.func.isRequired,
  toggleSidebar: PropTypes.func.isRequired,
};

export function FileBrowser({ toggleTheme }) {
  const files = useGetWorkspaceFiles();
  const {
    dispatch,
    editorManagerState: { wsName, openedDocs },
  } = useContext(EditorManagerContext);

  const openNew = useCallback(() => {
    dispatch({
      type: 'WORKSPACE/OPEN_NEW_DOC',
    });
  }, [dispatch]);

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
              dispatch({
                type: 'WORKSPACE/OPEN_DOC',
                docName: item.docName,
              });
            }}
            title={item.title}
            isActive={openedDocs.find((r) => r.wsPath === item.docName)}
            rightIcon={[
              <BaseButton
                key="delete"
                className="text-gray-600 hover:text-gray-900"
                faType="fas fa-times-circle "
                onClick={async (e) => {
                  e.stopPropagation();
                  dispatch({
                    type: 'WORKSPACE/DELETE_DOC',
                    docName: item.docName,
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

export class FileBrowser2 extends React.PureComponent {
  static contextType = WorkspaceContext;
  static propTypes = {
    toggleTheme: PropTypes.func.isRequired,
    toggleSidebar: PropTypes.func.isRequired,
  };

  openNew = async () => {
    await this.context.updateContext(workspaceActions.openBlankWorkspaceFile());
    this.props.toggleSidebar();
  };

  downloadBackup = async () => {};

  generateRows = () => {
    if (!this.context.workspace) {
      return;
    }
    const { updateContext, openedDocuments, workspace } = this.context;
    let files = workspace.files;

    const children = files.map((item) => (
      <SideBarRow
        key={item.docName}
        onClick={() =>
          updateContext(workspaceActions.openWorkspaceFile(item.docName))
        }
        title={item.title}
        isActive={openedDocuments.find((r) => r.docName === item.docName)}
        rightIcon={[
          <BaseButton
            key="delete"
            className="text-gray-600 hover:text-gray-900"
            faType="fas fa-times-circle "
            onClick={async (e) => {
              e.stopPropagation();
              updateContext(workspaceActions.deleteWorkspaceFile(item.docName));
            }}
          />,
        ]}
      />
    ));

    return (
      <CollapsibleSideBarRow
        title={this.context.workspace.name}
        isSticky={true}
        leftIcon={<ChevronDown style={{ width: 16, height: 16 }} />}
        activeLeftIcon={<ChevronRight style={{ width: 16, height: 16 }} />}
      >
        {children}
      </CollapsibleSideBarRow>
    );
  };
  render() {
    return (
      <SideBar
        openNew={this.openNew}
        toggleTheme={this.props.toggleTheme}
        downloadBackup={this.downloadBackup}
      >
        {this.generateRows()}
      </SideBar>
    );
  }
}
