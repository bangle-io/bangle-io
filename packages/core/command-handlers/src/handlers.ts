import { uiCommandHandlers } from './ui-command-handlers';
import { wsCommandHandlers } from './ws-command-handlers';

export const commandHandlers = [...uiCommandHandlers, ...wsCommandHandlers];
