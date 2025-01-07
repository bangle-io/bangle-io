import {
  basicOperationsHandlers,
  noteManagementHandlers,
  testHandlers,
  workspaceManagementHandlers,
} from './ui-handlers';

export const uiCommandHandlers = [
  ...testHandlers,
  ...basicOperationsHandlers,
  ...noteManagementHandlers,
  ...workspaceManagementHandlers,
];
