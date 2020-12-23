import PropTypes from 'prop-types';
import React from 'react';
import { UIActions } from '../../store/UIContext';
import { workspaceActions } from '../../workspace/WorkspaceContext';
import { SideBarRow } from '../Aside/SideBarRow';
import { INDEXDB_TYPE, NATIVE_FS_TYPE } from '../../workspace/type-helpers';
import { readFile } from '../../../app/misc/index';

export const commands = Object.entries(Commands());

function Commands() {
  return {
    'UIContext.toggleTheme': commandRenderHOC({
      hint: '',
      title: 'View: Toggle theme',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateUIContext, onDismiss }) => {
        updateUIContext(UIActions.toggleTheme());
        onDismiss();
      },
    }),

    'UIContext.toggleSideBar': commandRenderHOC({
      hint: '',
      title: 'View: Toggle sidebar',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateUIContext, onDismiss }) => {
        updateUIContext(UIActions.toggleSidebar());
        onDismiss();
      },
    }),

    // WorkspaceContext
    'WorkspaceContext.newFile': commandRenderHOC({
      hint: '',
      title: 'Workspace: New file',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateWorkspaceContext, onDismiss }) => {
        updateWorkspaceContext(workspaceActions.openBlankWorkspaceFile());
        onDismiss();
      },
    }),
    'WorkspaceContext.newBrowserWorkspace': commandRenderHOC({
      hint: '',
      title: 'Workspace: Create new workspace saved in your browser',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateUIContext, updateWorkspaceContext, onDismiss }) => {
        // dismiss to reset the execute prop on the parent component
        onDismiss();
        updateUIContext(
          UIActions.openPalette(
            'command/input/WorkspaceContext.newBrowserWorkspaceInput',
          ),
        );
      },
    }),

    'WorkspaceContext.newBrowserWorkspaceInput': commandRenderHOC({
      hint: '',
      hidden: true,
      title: 'Please give this workspace a name and press enter to finish',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,
      onExecute: ({ updateWorkspaceContext, onDismiss, query }) => {
        updateWorkspaceContext(
          workspaceActions.createNewIndexDbWorkspace(query, INDEXDB_TYPE),
        );
        onDismiss();
      },
    }),
    'WorkspaceContext.newNativeWorkspace': commandRenderHOC({
      hint: '',
      title: 'Workspace: Create new workspace saved in your filesystem',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateUIContext, updateWorkspaceContext, onDismiss }) => {
        // dismiss to reset the execute prop on the parent component
        onDismiss();
        updateUIContext(
          UIActions.openPalette(
            'command/input/WorkspaceContext.newNativeWorkspaceInput',
          ),
        );
      },
    }),

    'WorkspaceContext.newNativeWorkspaceInput': commandRenderHOC({
      hint: '',
      hidden: true,
      title: 'Please give this workspace a name and press enter to finish',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,
      onExecute: ({ updateWorkspaceContext, onDismiss, query }) => {
        updateWorkspaceContext(
          workspaceActions.createNewIndexDbWorkspace(query, NATIVE_FS_TYPE),
        );
        onDismiss();
      },
    }),

    'WorkspaceContext.openExistingWorkspace': commandRenderHOC({
      hint: '',
      title: 'Workspace: Open an existing workspace',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,
      onExecute: ({ updateUIContext, updateWorkspaceContext, onDismiss }) => {
        onDismiss();
        updateUIContext(UIActions.openPalette('workspace'));
      },
    }),
    'WorkspaceContext.restoreIndexdbWorkspaceFromBackup': restoreWorkspaceFromBackup(
      {
        hint: '',
        title: 'Workspace: Restore workspace from a backup (browser storage)',
        keywords: '',
        keyboardShortcut: '',
        priority: 10,
      },
      INDEXDB_TYPE,
    ),

    'WorkspaceContext.restoreNativeWorkspaceFromBackup': restoreWorkspaceFromBackup(
      {
        hint: '',
        title: 'Workspace: Restore workspace from a backup (filesystem)',
        keywords: '',
        keyboardShortcut: '',
        priority: 10,
      },
      NATIVE_FS_TYPE,
    ),

    'WorkspaceContext.takeWorkspaceBackup': commandRenderHOC({
      hint: '',
      title: 'Workspace: Take a backup',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,
      onExecute: ({ updateWorkspaceContext, onDismiss }) => {
        updateWorkspaceContext(workspaceActions.takeWorkspaceBackup());
        onDismiss();
      },
    }),
    'WorkspaceContext.deleteCurrentWorkspace': commandRenderHOC({
      hint: '',
      title: 'Workspace: Delete current workspace',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateWorkspaceContext, onDismiss }) => {
        updateWorkspaceContext(workspaceActions.deleteCurrentWorkspace());
        onDismiss();
      },
    }),

    'WorkspaceContext.renameCurrentWorkspace': commandRenderHOC({
      hint: '',
      title: 'Workspace: Rename current workspace',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateUIContext, onDismiss }) => {
        // dismiss to reset the execute prop on the parent component
        onDismiss();
        updateUIContext(
          UIActions.openPalette(
            'command/input/WorkspaceContext.renameCurrentWorkspaceInput',
          ),
        );
      },
    }),

    'WorkspaceContext.renameCurrentWorkspaceInput': commandRenderHOC({
      hint: '',
      hidden: true,
      title: 'Press enter to rename',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,

      onExecute: ({ updateWorkspaceContext, onDismiss, query }) => {
        updateWorkspaceContext(workspaceActions.renameCurrentWorkspace(query));
        onDismiss();
      },
    }),
  };
}

function queryMatch(command, query) {
  if (command.hidden) {
    return false;
  }

  if (command.keywords.length > 0) {
    if (strMatch(command.keywords.split(','), query)) {
      return true;
    }
  }
  return strMatch(command.title, query);
}

function commandRenderHOC(command) {
  const component = class CommandRenderUI extends React.PureComponent {
    static propTypes = {
      query: PropTypes.string.isRequired,
      isActive: PropTypes.bool.isRequired,
      execute: PropTypes.bool.isRequired,
      onDismiss: PropTypes.func.isRequired,
      updateUIContext: PropTypes.func.isRequired,
      updateWorkspaceContext: PropTypes.func.isRequired,
    };

    static queryMatch(query) {
      return queryMatch(command, query);
    }

    static title() {
      return command.title;
    }

    componentDidMount() {
      const { execute } = this.props;
      // parent signals execution by setting execute to true
      // and expects the child to call dismiss once executed
      if (execute === true) {
        this.onExecuteItem();
      }
    }

    componentDidUpdate(prevProps) {
      const { execute } = this.props;
      // parent signals execution by setting execute to true
      // and expects the child to call dismiss once executed
      if (execute === true && prevProps.execute !== execute) {
        this.onExecuteItem();
      }
    }

    onExecuteItem = () => {
      command.onExecute({
        updateUIContext: this.props.updateUIContext,
        updateWorkspaceContext: this.props.updateWorkspaceContext,
        onDismiss: this.props.onDismiss,
        query: this.props.query,
      });
      return;
    };

    render() {
      const { isActive } = this.props;
      return (
        <SideBarRow
          isActive={isActive}
          title={command.title}
          onClick={() => this.onExecuteItem()}
        />
      );
    }
  };
  return component;
}

function restoreWorkspaceFromBackup(command, type) {
  return class RestoreWorkspaceFromBackup extends React.Component {
    inputEl = React.createRef();

    static propTypes = {
      isActive: PropTypes.bool.isRequired,
      execute: PropTypes.bool.isRequired,
      onDismiss: PropTypes.func.isRequired,
      updateUIContext: PropTypes.func.isRequired,
      updateWorkspaceContext: PropTypes.func.isRequired,
    };

    static queryMatch(query) {
      return queryMatch(command, query);
    }

    componentDidMount() {
      const { execute } = this.props;
      // parent signals execution by setting execute to true
      // and expects the child to call dismiss once executed
      if (execute === true) {
        this.onExecuteItem();
      }
    }

    componentDidUpdate(prevProps) {
      const { execute } = this.props;
      // parent signals execution by setting execute to true
      // and expects the child to call dismiss once executed
      if (execute === true && prevProps.execute !== execute) {
        this.onExecuteItem();
      }
    }

    onExecuteItem = () => {
      if (this.inputEl.current) {
        console.log('clicking on exec');
        this.inputEl.current.click();
      }
      return;
    };

    render() {
      const { isActive } = this.props;
      return (
        <>
          <input
            type="file"
            ref={this.inputEl}
            id="workspaceFromBackupElement"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={async (event) => {
              const fileList = event.target.files;
              try {
                const file = JSON.parse(await readFile(fileList[0]));
                this.props.updateWorkspaceContext(
                  workspaceActions.newWorkspaceFromBackup(file, type),
                );
              } catch (error) {
                console.error(error);
                alert('Error reading file');
              }
              this.props.onDismiss();
            }}
          />
          <SideBarRow
            isActive={isActive}
            title={command.title}
            onClick={() => {
              if (this.inputEl.current) {
                console.log('clicking');
                this.inputEl.current.click();
              }
            }}
          />
        </>
      );
    }
  };
}

function strMatch(a, b) {
  b = b.toLocaleLowerCase();
  if (Array.isArray(a)) {
    return a.filter(Boolean).some((str) => strMatch(str, b));
  }

  a = a.toLocaleLowerCase();
  return a.includes(b) || b.includes(a);
}

commands.forEach(([key, command]) => {
  if (!command.queryMatch) {
    throw new Error('Must have query match');
  }
});
