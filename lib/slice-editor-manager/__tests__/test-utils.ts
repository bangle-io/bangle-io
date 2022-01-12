import { createEditorFromMd } from '@bangle.io/test-utils/create-editor-view';

export const getActionsDispatched = (mockDispatch) =>
  mockDispatch.mock.calls.map((r) => r[0].name);

export const getDispatchedAction = (mockDispatch, actionName) => {
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
