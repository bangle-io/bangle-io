import type { BangleEditor } from '@bangle.dev/core';
import type { Node, Schema, Slice as EditorSlice } from '@bangle.dev/pm';

import type { nsmApi2 } from '@bangle.io/api';
import type { FinalConfig } from '@bangle.io/config';
import type * as constants from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import type { sliceManualPaste } from '@bangle.io/pm-manual-paste';
import type { NsmStore } from '@bangle.io/shared-types';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';
import type { nsmPageSlice } from '@bangle.io/slice-page';
import type { workspaceSliceKey, writeNote } from '@bangle.io/slice-workspace';
import type { getEditorPluginMetadata } from '@bangle.io/utils';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

export interface E2ETypes {
  config: FinalConfig;
  constants: typeof constants;
  naukarProxy: typeof _naukarProxy;
  pushWsPath: typeof workspaceContext.pushWsPath;
  store: ApplicationStore;
  workspaceSliceKey: typeof workspaceSliceKey;
  writeNote: typeof writeNote;
  pm: {
    getEditorSchema: () => Schema;
    Slice;
  };
}

export type NSME2eTypes = {
  config: FinalConfig;
  testRequestDeleteCollabInstance: (wsPath: WsPath) => Promise<void>;
  e2eHealthCheck: () => Promise<boolean>;
  constants: typeof constants;
  primaryEditor?: BangleEditor | undefined;
  secondaryEditor?: BangleEditor | undefined;
  getEditorDetailsById: (id: EditorIdType) =>
    | {
        editor: BangleEditor;
        wsPath: string;
      }
    | undefined;
  sliceManualPaste: typeof sliceManualPaste;
  EditorSlice: typeof EditorSlice;
  getEditorPluginMetadata: typeof getEditorPluginMetadata;
  getOpenedWsPaths: () => OpenedWsPaths;
  getPageSliceState: () => ReturnType<typeof nsmPageSlice.getState>;
  getNsmStore: () => NsmStore;
  nsmApi2: typeof nsmApi2;
  // pm: {
  //   createNodeFromMd: (md: string) => Node;
  //   getEditorSchema: () => Schema;
  //   Slice;
  // };
};

export interface E2ENaukarTypes {
  config: FinalConfig;
  store: ApplicationStore;
}
