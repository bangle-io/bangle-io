// This file provides mocked return value
// so that the consumer doesnt have to mock
// every value which they dont care about,
// while still getting type checks
// {
//  ...getEditorPluginMetadataReturn,
//  // override things
//  wsPath: 'xyz:sys.md'
// }
import { EditorDisplayType } from '@bangle.io/constants';
import { getEditorPluginMetadata } from '@bangle.io/utils';

export const getEditorPluginMetadataReturn: ReturnType<
  typeof getEditorPluginMetadata
> = {
  dispatchAction: jest.fn(),
  editorDisplayType: EditorDisplayType.Page,
  wsPath: 'test-workspace:my-test-note.md',
};
