import { basicOperationsHandlers } from './ui-handlers/basic-operations';
import { noteManagementHandlers } from './ui-handlers/note-management';
import { testHandlers } from './ui-handlers/test-handler';
import { workspaceManagementHandlers } from './ui-handlers/workspace-management';

export const uiCommandHandlers = [
  ...testHandlers,
  ...basicOperationsHandlers,
  ...noteManagementHandlers,
  ...workspaceManagementHandlers,
];
