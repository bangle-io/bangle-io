import { createEditorFromMd } from '@bangle.io/test-utils';

export const getActionsDispatched = (mockDispatch: jest.SpyInstance) =>
  mockDispatch.mock.calls.map((r) => r[0].name);

export const getDispatchedAction = (
  mockDispatch: jest.SpyInstance,
  actionName: string,
) => {
  return mockDispatch.mock.calls
    .map((r) => r[0])
    .filter((r) => r.name === actionName);
};
export const createTestEditor = (
  wsPath: string = 'test:first.md',
  markdown: string = `# hello world`,
) => {
  return createEditorFromMd(markdown, {
    pluginMetadata: { wsPath },
  });
};
