import { uuid } from '@bangle.dev/core/utils/js-utils';
import browser from '@bangle.dev/core/utils/browser';
import React from 'react';
import { IndexDbWorkspace } from './workspace';
import { INDEXDB_TYPE } from './type-helpers';
import { WorkspacesInfo } from './workspaces-info';
import { specRegistry } from '../editor/spec-sheet';

const LOG = false;

let log = LOG ? console.log.bind(console, 'play/ws-context') : () => {};

const isMobile = browser.ios || browser.android;

const MAX_WINDOWS =
  new URLSearchParams(window.location.search).get('single-pane') || isMobile
    ? 1
    : 2;

export const WorkspaceContext = React.createContext(undefined);

export const workspaceActions = {
  createWorkspaceFile: (docName, docJson) => async (value) => {
    const newFile = await value.workspace.createFile(docName, docJson);
    return {
      type: 'NEW_WORKSPACE_FILE',
      payload: {
        file: newFile,
      },
    };
  },

  openWorkspaceFile: (docName) => async (value) => {
    return {
      type: 'OPEN_WORKSPACE_FILE',
      payload: {
        docName: docName,
      },
    };
  },

  openBlankWorkspaceFile: (suggestedDocName) => async (value) => {
    const newFile = await value.workspace.createFile(suggestedDocName, null);
    return {
      type: 'OPEN_BLANK_WORKSPACE_FILE',
      payload: {
        file: newFile,
      },
    };
  },

  deleteWorkspaceFile: (docName) => async (value) => {
    const workspaceFile = value.workspace.getFile(docName);
    if (workspaceFile) {
      await workspaceFile.delete();
      return {
        type: 'DELETE_WORKSPACE_FILE',
        payload: {
          file: workspaceFile,
        },
      };
    }
  },

  openWorkspaceByWorkspaceInfo: (workspaceInfo) => async (value) => {
    const workspace = await IndexDbWorkspace.openExistingWorkspace(
      workspaceInfo,
      value.schema,
    );
    return workspaceActions.replaceWorkspace(workspace)(value);
  },

  createNewIndexDbWorkspace: (
    name = 'bangle-' + Math.floor(100 * Math.random()),
    type = INDEXDB_TYPE,
  ) => async (value) => {
    const workspace = await IndexDbWorkspace.createWorkspace(
      name,
      value.schema,
      type,
    );
    return workspaceActions.replaceWorkspace(workspace)(value);
  },

  deleteCurrentWorkspace: () => async (value) => {
    const workspaceName = value.workspaceInfoThatNeedsPermission
      ? value.workspaceInfoThatNeedsPermission.name
      : value.workspace.name;

    let confirm = window.confirm(
      `Are you sure you want to delete ${workspaceName}?`,
    );

    if (confirm) {
      if (value.workspaceInfoThatNeedsPermission) {
        await WorkspacesInfo.delete(value.workspaceInfoThatNeedsPermission.uid);
      } else {
        await value.workspace.deleteWorkspace();
      }
      return workspaceActions.onMountWorkspaceLoad()(value);
    } else {
      return workspaceActions.noop()(value);
    }
  },

  renameCurrentWorkspace: (newName) => async (value) => {
    const workspace = await value.workspace.rename(newName);

    return workspaceActions.replaceWorkspace(workspace)(value);
  },

  replaceWorkspace: (workspace) => async (value) => {
    return {
      type: 'REPLACE_WORKSPACE',
      payload: {
        workspace,
      },
    };
  },

  newWorkspaceFromBackup: (data, type) => async (value) => {
    let workspace = await IndexDbWorkspace.restoreWorkspaceFromBackupFile(
      data,
      value.schema,
      type,
    );

    return workspaceActions.replaceWorkspace(workspace)(value);
  },

  takeWorkspaceBackup: () => async (value) => {
    value.workspace.downloadBackup();
    return workspaceActions.noop()(value);
  },

  noop: () => async (value) => {
    return { type: 'NO_OP' };
  },

  updateWorkspacesInfo: () => async (value) => {
    return {
      type: 'UPDATE_WORKSPACES_INFO',
      payload: {
        availableWorkspacesInfo: await WorkspacesInfo.list(),
      },
    };
  },

  onMountWorkspaceLoad: () => async (value) => {
    const availableWorkspacesInfo = await WorkspacesInfo.list();
    let workspace;
    if (availableWorkspacesInfo.length > 0) {
      const toOpen = availableWorkspacesInfo[0];
      if (await WorkspacesInfo.needsPermission(toOpen)) {
        return {
          type: 'WORKSPACE_NEEDS_PERMISSION',
          payload: {
            availableWorkspacesInfo,
            workspaceInfoThatNeedsPermission: toOpen,
          },
        };
      }

      workspace = await IndexDbWorkspace.openExistingWorkspace(
        toOpen,
        value.schema,
      );
    } else {
      const name = 'bangle-' + Math.floor(100 * Math.random());
      workspace = await IndexDbWorkspace.createWorkspace(
        name,
        value.schema,
        INDEXDB_TYPE,
      );
    }

    return {
      type: 'REPLACE_WORKSPACE',
      payload: {
        availableWorkspacesInfo,
        workspace,
      },
    };
  },
};

const reducers = (value, { type, payload }) => {
  let newValue = value;
  if (type === 'NO_OP') {
  } else if (type === 'ERROR') {
    // TODO implement me ? reset state?
    throw payload.error;
  } else if (type === 'WORKSPACE_NEEDS_PERMISSION') {
    const {
      workspaceInfoThatNeedsPermission,
      availableWorkspacesInfo,
    } = payload;
    newValue = {
      ...value,
      availableWorkspacesInfo,
      workspaceInfoThatNeedsPermission,
    };
  } else if (type === 'NEW_WORKSPACE_FILE') {
    const { file } = payload;
    newValue = {
      ...value,
      workspace: value.workspace.linkFile(file),
    };
  } else if (type === 'OPEN_BLANK_WORKSPACE_FILE') {
    const { file } = payload;
    newValue = {
      ...value,
      workspace: value.workspace.linkFile(file),
      openedDocuments: calculateOpenedDocuments(
        file.docName,
        value.openedDocuments,
      ),
    };
  } else if (type === 'OPEN_WORKSPACE_FILE') {
    const { docName } = payload;
    if (value.workspace.files.find((w) => w.docName === docName)) {
      newValue = {
        ...value,
        openedDocuments: calculateOpenedDocuments(
          docName,
          value.openedDocuments,
        ),
      };
    }
  } else if (type === 'REPLACE_WORKSPACE') {
    const { workspace, availableWorkspacesInfo } = payload;
    let openedDocName =
      workspace.files.length === 0
        ? uuid(4)
        : workspace.getLastModifiedFile().docName;

    // TODO this is sort of a surprise we shouldn't do this
    // as it assumes we want to persist the older workspace
    if (value.workspace) {
      value.workspace.persistWorkspace();
    }
    newValue = {
      ...value,
      workspace,
      workspaceInfoThatNeedsPermission: null,
      openedDocuments: calculateOpenedDocuments(openedDocName, []),
    };
    if (availableWorkspacesInfo) {
      newValue.availableWorkspacesInfo = availableWorkspacesInfo;
    }
  } else if (type === 'DELETE_WORKSPACE_FILE') {
    const { file } = payload;
    const workspace = value.workspace.unlinkFile(file);
    const newFiles = value.openedDocuments.filter(({ docName }) =>
      workspace.files.find((w) => w.docName === docName),
    );
    newValue = {
      ...value,
      workspace,
      openedDocuments: newFiles,
    };
  } else if (type === 'UPDATE_WORKSPACES_INFO') {
    const { availableWorkspacesInfo } = payload;
    newValue = {
      ...value,
      availableWorkspacesInfo,
    };
  } else {
    throw new Error('Unknown type');
  }

  log({ type, newValue });

  return newValue;
};

export const updateWorkspaceContext = async (action, value) => {
  let resolvedResult;
  try {
    resolvedResult = await action(value);
  } catch (err) {
    resolvedResult = {
      type: 'ERROR',
      payload: {
        error: err,
      },
    };
    return (state) => ({
      value: reducers(state.value, resolvedResult),
    });
  }
  if (resolvedResult === undefined) {
    return (state) => state;
  }
  return (state) => ({
    value: reducers(state.value, resolvedResult),
  });
};

export class WorkspaceContextProvider extends React.PureComponent {
  get value() {
    return this.state.value;
  }

  updateWorkspaceContext = async (action) => {
    this.setState(await updateWorkspaceContext(action, this.value));
  };

  initialValue = {
    /**@type {Workspace | undefined} */
    workspace: null,
    openedDocuments: [],
    schema: specRegistry.schema,
    availableWorkspacesInfo: null,
    pendingWorkspaceInfo: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      value: this.initialValue,
    };
  }

  async componentDidMount() {
    await this.updateWorkspaceContext(workspaceActions.onMountWorkspaceLoad());
  }

  _injectUpdateContext(value) {
    // todo deprecate this style
    value.updateContext = this.updateWorkspaceContext;
    value.updateWorkspaceContext = this.updateWorkspaceContext;
    return value;
  }

  render() {
    window.workspaceValue = this.value;
    return (
      <WorkspaceContext.Provider value={this._injectUpdateContext(this.value)}>
        {this.props.children}
      </WorkspaceContext.Provider>
    );
  }
}

function createOpenedDocument(docName) {
  if (typeof docName !== 'string') {
    throw new Error('docName must be string');
  }
  // we use key as React key for uniquely rendering multiple
  // instances of the same docName
  return { docName: docName, key: docName + '-' + uuid(4) };
}

function calculateOpenedDocuments(docName, openedDocuments) {
  const newDoc = createOpenedDocument(docName);

  if (openedDocuments.length < MAX_WINDOWS) {
    return [newDoc, ...openedDocuments]; // we put new things on the left
  }
  // replace the first non matching from left
  let match = openedDocuments.findIndex((r) => r.docName !== docName);
  // if no match replace the first item
  if (match === -1) {
    match = 0;
  }
  const newState = openedDocuments.map((doc, index) =>
    // replace the matched item with docName
    index === match ? newDoc : doc,
  );
  return newState;
}
