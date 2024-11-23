import { bangleAppCommands } from '@bangle.io/commands';
import { commandHandlers } from '../handlers';

describe('Command Validation', () => {
  test('should not have duplicate command handler ids', () => {
    const handlerIds = commandHandlers.map((c) => c.id);
    const uniqueHandlerIds = new Set(handlerIds);
    expect(uniqueHandlerIds.size).toBe(handlerIds.length);
  });

  test('should not have duplicate command ids', () => {
    const commandIds = bangleAppCommands.map((c) => c.id);
    const uniqueCommandIds = new Set(commandIds);
    expect(uniqueCommandIds.size).toBe(commandIds.length);
  });

  test('each handler id should have a corresponding command id', () => {
    const handlerIds = new Set(commandHandlers.map((c) => c.id));
    const commandIds = new Set(bangleAppCommands.map((c) => c.id));
    for (const id of handlerIds) {
      expect(commandIds.has(id)).toBe(true);
    }
  });
});
