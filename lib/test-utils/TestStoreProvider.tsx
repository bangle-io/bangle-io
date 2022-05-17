import React from 'react';

import {
  BangleStoreChanged,
  BangleStoreContext,
} from '@bangle.io/bangle-store-context';
import { ApplicationStore } from '@bangle.io/create-store';
import { ExtensionRegistryContextProvider } from '@bangle.io/extension-registry';
import { EditorManager } from '@bangle.io/slice-editor-manager';
import { WorkspaceContextProvider } from '@bangle.io/slice-workspace';

export function TestStoreProvider({
  bangleStore,
  bangleStoreChanged,
  children,
  workspaceContextProvider = true,
  editorManagerContextProvider = false,
}: {
  bangleStore: ApplicationStore;
  bangleStoreChanged: number;
  children: React.ReactNode;
  workspaceContextProvider?: boolean;
  editorManagerContextProvider?: boolean;
}) {
  let res: React.ReactNode = children;

  if (editorManagerContextProvider) {
    res = <EditorManager>{res}</EditorManager>;
  }

  if (workspaceContextProvider) {
    res = <WorkspaceContextProvider>{res}</WorkspaceContextProvider>;
  }

  return (
    <BangleStoreContext.Provider value={bangleStore}>
      <BangleStoreChanged.Provider value={bangleStoreChanged}>
        <ExtensionRegistryContextProvider>
          {res}
        </ExtensionRegistryContextProvider>
      </BangleStoreChanged.Provider>
    </BangleStoreContext.Provider>
  );
}
