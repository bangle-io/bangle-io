import type { SpecRegistry } from '@bangle.dev/core';
import type { Node, PluginKey } from '@bangle.dev/pm';

export type { ExtensionRegistry } from '@bangle.io/extension-registry';
export type DialogComponentType = React.ComponentType<{
  dialogName: string;
  onDismiss: (dialogName: string) => void;
}>;

export interface DialogType {
  name: `dialog::${string}`;
  ReactComponent: DialogComponentType;
}

export type SerialOperationNameType = string;
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
  // when true, will prevent editor focus when executed
  preventEditorFocusOnExecute?: boolean;
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
  ReactComponent: React.ComponentType;
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

export interface NoteFormatProvider {
  name: string;

  extensions: string[];

  description: string;

  serializeNote: (
    doc: Node,
    specRegistry: SpecRegistry,
    fileName: string,
  ) => string;

  // Return PMNode if parsing is successful, otherwise return undefined
  parseNote: (
    value: string,
    specRegistry: SpecRegistry,
    // only applicable if dealing with prosemirror specific markdown
    markdownPlugins: any[],
  ) => Node | undefined;
}

export type OnStorageProviderError = (error: Error) => boolean;
