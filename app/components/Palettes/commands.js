import PropTypes from 'prop-types';
import React, { useCallback, useContext, useEffect } from 'react';
import { SideBarRow } from '../Aside/SideBarRow';
import { INDEXDB_TYPE, NATIVE_FS_TYPE } from '../../workspace/type-helpers';
import { readFile } from '../../misc/index';
import { EditorManagerContext } from 'bangle-io/app/workspace2/EditorManager';
import {
  useCreateNewFile,
  useWorkspaces,
} from 'bangle-io/app/workspace2/workspace-hooks';

export const commands = Object.entries(Commands());

function useCommandExecute(execute, onExecuteItem) {
  useEffect(() => {
    // parent signals execution by setting execute to true
    // and expects the child to call dismiss once executed
    if (execute) {
      onExecuteItem();
    }
  }, [execute, onExecuteItem]);
}

ToggleThemeCommand.title = 'View: Toggle theme';
ToggleThemeCommand.queryMatch = (query) =>
  queryMatch(ToggleThemeCommand, query);
function ToggleThemeCommand({ isActive, onDismiss, execute }) {
  const { dispatch } = useContext(EditorManagerContext);
  const onExecuteItem = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_THEME',
    });
    onDismiss();
  }, [dispatch, onDismiss]);

  useCommandExecute(execute, onExecuteItem);
  return (
    <SideBarRow
      isActive={isActive}
      title={ToggleThemeCommand.title}
      onClick={onExecuteItem}
    />
  );
}

ToggleSidebar.title = 'View: Toggle sidebar';
ToggleSidebar.queryMatch = (query) => queryMatch(ToggleSidebar, query);
function ToggleSidebar({ isActive, onDismiss, execute }) {
  const { dispatch } = useContext(EditorManagerContext);
  const onExecuteItem = useCallback(() => {
    dispatch({
      type: 'UI/TOGGLE_SIDEBAR',
    });
    onDismiss();
  }, [dispatch, onDismiss]);

  useCommandExecute(execute, onExecuteItem);
  return (
    <SideBarRow
      isActive={isActive}
      title={ToggleSidebar.title}
      onClick={onExecuteItem}
    />
  );
}

WorkspaceNewFile.title = 'Workspace: New File';
WorkspaceNewFile.queryMatch = (query) => queryMatch(WorkspaceNewFile, query);
function WorkspaceNewFile({ isActive, onDismiss, execute }) {
  const { dispatch } = useContext(EditorManagerContext);
  const onExecuteItem = useCallback(() => {
    onDismiss();
    // Doing it this way because Palette.js/watchClickOutside ends up dismissing
    // the input palette
    setTimeout(() => {
      dispatch({
        type: 'UI/OPEN_PALETTE',
        paletteType: 'command/input/WorkspaceContext.newFileInput',
      });
    }, 0);
  }, [onDismiss, dispatch]);

  useCommandExecute(execute, onExecuteItem);
  return (
    <SideBarRow
      isActive={isActive}
      title={WorkspaceNewFile.title}
      onClick={onExecuteItem}
    />
  );
}

WorkspaceNewFileInput.title = 'Enter Filename';
WorkspaceNewFileInput.hidden = true;
WorkspaceNewFileInput.queryMatch = (query) =>
  queryMatch(WorkspaceNewFileInput, query);
function WorkspaceNewFileInput({ isActive, onDismiss, execute, query }) {
  const createNewFile = useCreateNewFile();

  const onExecuteItem = useCallback(() => {
    createNewFile(query).then(() => {
      onDismiss();
    });
  }, [onDismiss, query, createNewFile]);

  useCommandExecute(execute, onExecuteItem);
  return (
    <SideBarRow
      isActive={isActive}
      title={WorkspaceNewFileInput.title}
      onClick={onExecuteItem}
    />
  );
}

WorkspaceNewBrowserWS.title = 'Workspace: New Workspace in Browser';
WorkspaceNewBrowserWS.queryMatch = (query) =>
  queryMatch(WorkspaceNewBrowserWS, query);
function WorkspaceNewBrowserWS({ isActive, onDismiss, execute }) {
  const { dispatch } = useContext(EditorManagerContext);
  const onExecuteItem = useCallback(() => {
    onDismiss();
    setTimeout(() => {
      dispatch({
        type: 'UI/OPEN_PALETTE',
        paletteType: 'command/input/WorkspaceContext.newBrowserWSInput',
      });
    }, 0);
  }, [onDismiss, dispatch]);

  useCommandExecute(execute, onExecuteItem);
  return (
    <SideBarRow
      isActive={isActive}
      title={WorkspaceNewBrowserWS.title}
      onClick={onExecuteItem}
    />
  );
}

WorkspaceNewBrowserWSInput.title = 'Enter Workspace name';
WorkspaceNewBrowserWSInput.hidden = true;
WorkspaceNewBrowserWSInput.queryMatch = (query) =>
  queryMatch(WorkspaceNewBrowserWSInput, query);
function WorkspaceNewBrowserWSInput({ isActive, onDismiss, execute, query }) {
  const { createWorkspace } = useWorkspaces();

  const onExecuteItem = useCallback(() => {
    onDismiss();
    createWorkspace(query, 'browser');
  }, [onDismiss, query, createWorkspace]);

  useCommandExecute(execute, onExecuteItem);

  return (
    <SideBarRow
      isActive={isActive}
      title={WorkspaceNewBrowserWSInput.title}
      onClick={onExecuteItem}
    />
  );
}

function Commands() {
  return {
    'UIContext.toggleTheme': ToggleThemeCommand,
    'UIContext.toggleSideBar': ToggleSidebar,

    // WorkspaceContext
    'WorkspaceContext.newFile': WorkspaceNewFile,
    'WorkspaceContext.newFileInput': WorkspaceNewFileInput,
    'WorkspaceContext.newBrowserWS': WorkspaceNewBrowserWS,
    'WorkspaceContext.newBrowserWSInput': WorkspaceNewBrowserWSInput,

    'WorkspaceContext.openExistingWorkspace': commandRenderHOC({
      hint: '',
      title: 'Workspace: Open an existing workspace',
      keywords: '',
      keyboardShortcut: '',
      priority: 10,
      onExecute: ({ updateUIContext, updateWorkspaceContext, onDismiss }) => {
        onDismiss();
        // updateUIContext(UIActions.openPalette('workspace'));
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
        // updateWorkspaceContext(workspaceActions.takeWorkspaceBackup());
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
        // updateWorkspaceContext(workspaceActions.deleteCurrentWorkspace());
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
        // updateUIContext(
        //   UIActions.openPalette(
        //     'command/input/WorkspaceContext.renameCurrentWorkspaceInput',
        //   ),
        // );
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
        // updateWorkspaceContext(workspaceActions.renameCurrentWorkspace(query));
        onDismiss();
      },
    }),
  };
}

function queryMatch(command, query) {
  if (command.hidden) {
    return false;
  }

  const keywords = command.keywords || '';

  if (keywords.length > 0) {
    if (strMatch(keywords.split(','), query)) {
      return true;
    }
  }
  return strMatch(command.title, query);
}

function commandRenderHOC(command) {
  const component = class CommandRenderUI extends React.PureComponent {
    static contextType = EditorManagerContext;
    static propTypes = {
      query: PropTypes.string.isRequired,
      isActive: PropTypes.bool.isRequired,
      execute: PropTypes.bool.isRequired,
      onDismiss: PropTypes.func.isRequired,
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
        context: this.context,
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
                // this.props.updateWorkspaceContext(
                //   workspaceActions.newWorkspaceFromBackup(file, type),
                // );
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
