import waitForExpect from 'wait-for-expect';

waitForExpect.defaults.timeout = 600;
waitForExpect.defaults.interval = 30;
export { waitForExpect };

export {
  getStoreFromStorybookContext,
  StorybookStore,
  storybookStoreDecorator,
} from './storybook-store';
export { testEditor, testEditorMarkdown } from './test-editor';
export { setupTestExtension } from './test-extension';
export * from './test-store';
export type { Meta, StoryObj } from '@storybook/react';
