import './aside.css';
import React from 'react';
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
import { UIActions } from '../../store/UIContext';

export class FileBrowser extends React.PureComponent {
  static contextType = WorkspaceContext;
  static propTypes = {
    updateUIContext: PropTypes.func.isRequired,
  };

  openNew = async () => {
    await this.context.updateContext(workspaceActions.openBlankWorkspaceFile());
    await this.props.updateUIContext(UIActions.toggleSidebar());
  };

  toggleTheme = async () => {
    await this.props.updateUIContext(UIActions.toggleTheme());
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
        toggleTheme={this.toggleTheme}
        downloadBackup={this.downloadBackup}
      >
        {this.generateRows()}
      </SideBar>
    );
  }
}
