import {
  basicOperationsHandlers,
  nativeFsRecoveryHandlers,
  noteManagementHandlers,
  testHandlers,
  workspaceManagementHandlers,
} from './ui-handlers';

export const uiCommandHandlers = [
  ...testHandlers,
  ...basicOperationsHandlers,
  ...nativeFsRecoveryHandlers,
  ...noteManagementHandlers,
  ...workspaceManagementHandlers,
];
