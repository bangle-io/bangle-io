// this is injected into the plugin setup function

import type { Plugin } from '@bangle.dev/pm';

import type { EditorDisplayType } from '@bangle.io/constants';
import { ApplicationStore } from '@bangle.io/create-store';

import type { DispatchSerialOperationType } from './extension-registry';

// as pluginMetadata field by bangle.dev
export interface EditorPluginMetadata {
  wsPath: string;
  editorDisplayType: EditorDisplayType;
  editorId?: number;
  dispatchSerialOperation: DispatchSerialOperationType;
  bangleStore: ApplicationStore;
}

export type EditorPlugin = ({
  metadata,
}: {
  metadata: EditorPluginMetadata;
}) => Plugin | Plugin[];
