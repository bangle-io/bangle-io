import React from 'react';
import { workspaceActions, WorkspaceContext } from './WorkspaceContext';
import { requestPermission } from './native-fs-driver';
import { keybindingsHelper } from '../misc/keybinding-helper';

export class WorkspacePermissionModal extends React.PureComponent {
  static contextType = WorkspaceContext;
  state = {
    rejectedAccess: false,
  };

  requestPermission = async () => {
    const workspaceInfo = this.context.workspaceInfoThatNeedsPermission;
    if (await requestPermission(workspaceInfo.metadata.dirHandle)) {
      this.context.updateWorkspaceContext(
        workspaceActions.openWorkspaceByWorkspaceInfo(
          this.context.workspaceInfoThatNeedsPermission,
        ),
      );
      if (this.state.rejectedAccess) {
        this.setState({
          rejectedAccess: false,
        });
      }
      return;
    }

    this.setState({
      rejectedAccess: true,
    });
  };

  getMessage = () => {
    const name = this.context.workspaceInfoThatNeedsPermission.name;
    let msg = '';
    if (this.state.rejectedAccess) {
      msg += `You will need to give permission to access '${name}'.`;
    }
    msg += `Press Enter twice or click anywhere to resume working on '${name}'`;
    return msg;
  };

  componentDidMount() {
    this.setupKeybinding();
  }
  componentDidUpdate() {
    this.setupKeybinding();
  }
  componentWillUnmount() {
    if (this.removeKeybinding) {
      this.removeKeybinding();
    }
  }

  removeKeybinding = null;

  setupKeybinding() {
    if (!this.context.workspaceInfoThatNeedsPermission) {
      if (this.removeKeybinding) {
        this.removeKeybinding();
      }
      return;
    }

    // binding is already setup
    if (this.removeKeybinding) {
      return;
    }

    const callback = keybindingsHelper({
      Enter: () => {
        if (!this.context.workspaceInfoThatNeedsPermission) {
          return false;
        }
        this.requestPermission();
        return true;
      },
    });

    document.addEventListener('keydown', callback);

    this.removeKeybinding = () => {
      document.removeEventListener('keydown', callback);
      this.removeKeybinding = null;
    };
  }

  render() {
    if (this.context.workspaceInfoThatNeedsPermission) {
      return (
        <div
          className="flex justify-center flex-row h-full"
          onClick={this.requestPermission}
        >
          {this.getMessage()}
        </div>
      );
    }
    return this.props.children;
  }
}
