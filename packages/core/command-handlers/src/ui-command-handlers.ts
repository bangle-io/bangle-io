import {
  basicOperationsHandlers,
  editorOperationsHandlers,
  nativeFsRecoveryHandlers,
  noteManagementHandlers,
  testHandlers,
  workspaceManagementHandlers,
} from './ui-handlers';

export const uiCommandHandlers = [
  ...testHandlers,
  ...basicOperationsHandlers,
  ...editorOperationsHandlers,
  ...nativeFsRecoveryHandlers,
  ...noteManagementHandlers,
  ...workspaceManagementHandlers,
];
