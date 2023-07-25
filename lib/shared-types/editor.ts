// this is injected into the plugin setup function

import type { Plugin } from '@bangle.dev/pm';

import type { EditorDisplayType } from '@bangle.io/constants';
import type { EditorIdType } from '@bangle.io/slice-editor-manager';

import type { EternalVars } from './eternal-vars';
import type { DispatchSerialOperationType } from './extension-registry';
import type { NsmStore } from './store';
import type { WsPath } from './workspace';

export type { EditorIdType } from '@bangle.io/slice-editor-manager';

// as pluginMetadata field by bangle.dev
export interface EditorPluginMetadata {
  wsPath: WsPath;
  editorDisplayType: EditorDisplayType;
  editorId?: EditorIdType;
  dispatchSerialOperation: DispatchSerialOperationType;
  nsmStore: NsmStore;
  createdAt: number;
  collabMessageBus: EternalVars['editorCollabMessageBus'];
}

export type EditorPlugin = ({
  metadata,
}: {
  metadata: EditorPluginMetadata;
}) => Plugin | Plugin[];

export type { Node } from '@bangle.dev/pm';
