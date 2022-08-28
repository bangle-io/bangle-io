import type { Node, Schema } from '@bangle.dev/pm';

import type { FinalConfig } from '@bangle.io/config';
import type * as constants from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import type { sliceManualPaste } from '@bangle.io/pm-manual-paste';
import type { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import type { pageSliceKey } from '@bangle.io/slice-page';
import type { workspaceSliceKey, writeNote } from '@bangle.io/slice-workspace';
import type { getEditorPluginMetadata } from '@bangle.io/utils';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

export interface E2ETypes {
  config: FinalConfig;
  constants: typeof constants;
  e2eHealthCheck: () => Promise<boolean>;
  editorManagerSliceKey: typeof editorManagerSliceKey;
  getEditorPluginMetadata: typeof getEditorPluginMetadata;
  getOpenedWsPaths: () => OpenedWsPaths;
  naukarProxy: typeof _naukarProxy;
  pageSliceKey: typeof pageSliceKey;
  pushWsPath: typeof workspaceContext.pushWsPath;
  sliceManualPaste: typeof sliceManualPaste;
  store: ApplicationStore;
  workspaceSliceKey: typeof workspaceSliceKey;
  writeNote: typeof writeNote;
  pm: {
    createNodeFromMd: (md: string) => Node;
    getEditorSchema: () => Schema;
    Slice;
  };
}

export interface E2ENaukarTypes {
  config: FinalConfig;
  store: ApplicationStore;
}
