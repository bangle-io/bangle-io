import type { PluginKey } from '@bangle.dev/pm';

export type SerialOperationNameType = `operation::${string}`;
export interface SerialOperationType {
  name: SerialOperationNameType;
  value?: any;
}
export interface SerialOperationDefinitionType {
  name: SerialOperationType['name'];
  title: string;
  keywords?: string[];
  keybinding?: string;
  // when true, will hide it from the user
  hidden?: boolean;
}
export type DispatchSerialOperationType = (
  sOperation: SerialOperationType,
) => void;

export type SerialOperationHandler = (
  sOperation: SerialOperationType,
) => boolean | undefined;

export type SerialOperationKeybindingMapping = Record<
  SerialOperationNameType,
  string
>;

export interface NoteSidebarWidget {
  name: `note-sidebar-widget::${string}`;
  ReactComponent: React.ComponentType<{}>;
  title: string;
}

export interface EditorWatchPluginState {
  // The operation to dispatch when state changes
  // Bangle.io will passe an editorId when dispatching this sOperation
  // to help identify which editors plugin state changed.
  operation: SerialOperationNameType;
  // The pluginKey of the plugin's state to watch
  pluginKey: PluginKey;
}
