import { useEditorViewContext } from '@bangle.dev/react';

import { getEditorPluginMetadata } from './editor';

export function useEditorPluginMetadata() {
  const view = useEditorViewContext();

  return getEditorPluginMetadata(view.state);
}
