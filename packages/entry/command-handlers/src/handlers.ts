import { C } from './helper';

export const commandHandlers = [
  C('command::ui:toggle-omni-search', () => {}),
  C('command::ui:toggle-sidebar', () => {}),
  C('command::ui:create-new-workspace', (_, { workspaceType, wsName }) => {
    console.log('hello', { wsName, workspaceType });
  }),
];
