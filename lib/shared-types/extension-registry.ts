import type { PluginKey } from '@bangle.dev/pm';

export type ActionNameType = `action::${string}`;
export interface ActionType {
  name: ActionNameType;
  value?: any;
}
export interface ActionDefinitionType {
  name: ActionType['name'];
  title: string;
  keybinding?: string;
  // when true, will hide it from the user
  hidden?: boolean;
}
export type DispatchActionType = (action: ActionType) => void;

export type ActionHandler = (action: ActionType) => boolean;

export type ActionKeybindingMapping = Record<ActionNameType, string>;

export interface NoteSidebarWidget {
  name: `note-sidebar-widget:${string}`;
  ReactComponent: React.ComponentType<{}>;
  title: string;
}

export interface EditorWatchPluginState {
  // The action to dispatch when state changes
  // Bangle.io will passe an editorId when dispatching this action
  // to help identify which editors plugin state changed.
  action: ActionNameType;
  // The pluginKey of the plugin's state to watch
  pluginKey: PluginKey;
}
