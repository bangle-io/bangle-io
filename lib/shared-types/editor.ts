// this is injected into the plugin setup function

import type { Plugin } from '@bangle.dev/pm';

import type { EditorDisplayType } from '@bangle.io/constants';
import type { ApplicationStore } from '@bangle.io/create-store';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';

import type { DispatchSerialOperationType } from './extension-registry';
import type { NsmStore } from './store';

export type { EditorIdType } from '@bangle.io/slice-editor-manager';

// as pluginMetadata field by bangle.dev
export interface EditorPluginMetadata {
  wsPath: string;
  editorDisplayType: EditorDisplayType;
  editorId?: EditorIdType;
  dispatchSerialOperation: DispatchSerialOperationType;
  bangleStore: ApplicationStore;
  nsmStore: NsmStore;
  createdAt: number;
}

export type EditorPlugin = ({
  metadata,
}: {
  metadata: EditorPluginMetadata;
}) => Plugin | Plugin[];
