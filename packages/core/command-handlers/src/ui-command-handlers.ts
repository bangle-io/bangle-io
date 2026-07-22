import {
  basicOperationsHandlers,
  editorOperationsHandlers,
  nativeFsRecoveryHandlers,
  noteManagementHandlers,
  workspaceManagementHandlers,
} from './ui-handlers';

export const uiCommandHandlers = [
  ...basicOperationsHandlers,
  ...editorOperationsHandlers,
  ...nativeFsRecoveryHandlers,
  ...noteManagementHandlers,
  ...workspaceManagementHandlers,
];
