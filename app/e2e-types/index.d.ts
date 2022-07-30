import type { Schema } from '@bangle.dev/pm';
import { Slice as EditorSlice } from '@bangle.dev/pm';

import type * as constants from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import type { sliceManualPaste } from '@bangle.io/pm-manual-paste';
import type { editorManagerSliceKey } from '@bangle.io/slice-editor-manager';
import type { pageSliceKey } from '@bangle.io/slice-page';
import type { workspaceSliceKey } from '@bangle.io/slice-workspace';
import type { getEditorPluginMetadata } from '@bangle.io/utils';
import type { naukarProxy } from '@bangle.io/worker-naukar-proxy';
import type { OpenedWsPaths } from '@bangle.io/ws-path';

export interface E2ETypes {
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
  pm: {
    getEditorSchema: () => Schema;
    Slice;
  };
}
