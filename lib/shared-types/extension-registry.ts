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
