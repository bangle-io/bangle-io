import React from 'react';

import {
  workspaceActions,
  WorkspaceContext,
} from '../workspace/WorkspaceContext';
import { defaultContent } from './constants';
import { LocalDisk } from '@bangle.dev/collab/client/local-disk';
import { Manager } from '@bangle.dev/collab/server/manager';
import { specRegistry } from '../editor/spec-sheet';
import { config } from 'bangle-play/config';
import { WorkspacesInfo } from '../workspace/workspaces-info';
import { IndexDbWorkspace } from '../workspace/workspace';

const DEBUG = true;
const LOG = false;
let log = LOG ? console.log.bind(console, 'EditorManager') : () => {};

async function findMatchingWorkspace(docName, schema) {
  const availableWorkspacesInfo = await WorkspacesInfo.list();
  for (const info of availableWorkspacesInfo) {
    let workspace = await IndexDbWorkspace.openExistingWorkspace(info, schema);

    if (workspace.hasFile(docName)) {
      return workspace;
    }
  }
}
export class EditorManager extends React.PureComponent {
  static contextType = WorkspaceContext;

  schema = specRegistry.schema;
  cache = new WeakMap();

  disk = new LocalDisk({
    getItem: async (docName) => {
      const file = this.context.workspace.getFile(docName);

      if (!file) {
        let oldWorkspace = await findMatchingWorkspace(docName, this.schema);

        if (!oldWorkspace) {
          // This shouldnt happen, if !file this should be true or where else
          // is file coming
          log('no matching ws found, creating default content');
          return defaultContent;
        }

        log(
          'docName=',
          docName,
          'found matching content for an old workspace',
          oldWorkspace,
        );
        return oldWorkspace.getFile(docName).doc;
      }

      if (file.doc === null) {
        return defaultContent;
      }
      return file.doc;
    },
    setItem: async (docName, doc) => {
      let lookup = this.cache.get(this.context.workspace);
      if (!lookup) {
        lookup = {};
        this.cache.set(this.context.workspace, lookup);
      }

      if (lookup[docName] === doc) {
        log('same doc passed in', docName);
        return;
      }
      lookup[docName] = doc;

      const docJson = doc.toJSON();
      log('setitem', docName);
      const workspaceFile = this.context.workspace.getFile(docName);
      if (workspaceFile) {
        await workspaceFile.updateDoc(docJson);
        return;
      }

      let oldWorkspace = await findMatchingWorkspace(docName, this.schema);

      if (!oldWorkspace) {
        log(
          'no matching ws found, creating new file in ',
          this.context.workspace,
        );
        await this.context.updateContext(
          workspaceActions.createWorkspaceFile(docName, docJson),
        );
        return;
      }
      log(
        'docName=',
        docName,
        'found matching content for an old workspace, SAVING!',
        oldWorkspace,
      );
      await oldWorkspace.getFile(docName).updateDoc(docJson);
    },
  });

  manager = new Manager(this.schema, {
    disk: this.disk,
  });

  removeAskForSave = null;

  registerAskForSave = () => {
    if (!this.context.workspace || this.removeAskForSave) {
      return;
    }
    if (
      this.context.workspace.name.includes('production') ||
      config.isProduction
    ) {
      const listener = (event) => {
        this.disk.flushAll();
        event.returnValue = `Are you sure you want to leave?`;
      };

      window.addEventListener('beforeunload', listener);
      this.removeAskForSave = () => {
        window.removeEventListener('beforeunload', listener);
      };
    }
  };

  componentDidUpdate() {
    this.registerAskForSave();
  }

  componentDidMount() {
    if (DEBUG) {
      window.manager = this.manager;
    }
    this.registerAskForSave();
  }

  componentWillUnmount() {
    this.manager.destroy();
    if (this.removeAskForSave) {
      this.removeAskForSave();
    }
  }

  render() {
    if (this.context.pendingWorkspaceInfo) {
      return (
        <div>
          Press enter twice or click here to open{' '}
          {this.context.pendingWorkspaceInfo.name}
        </div>
      );
    }
    return this.props.children(this.manager, this.context.openedDocuments);
  }
}
