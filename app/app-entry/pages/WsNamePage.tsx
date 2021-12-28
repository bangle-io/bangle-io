import React, { ReactNode } from 'react';

import { EditorContainer } from '@bangle.io/editor-container';
import { useUIManagerContext } from '@bangle.io/ui-context';
import { MultiColumnMainContent } from '@bangle.io/ui-dhancha';
import { useWorkspaceContext } from '@bangle.io/workspace-context';

import { EmptyEditorPage } from './EmptyEditorPage';

export function WsNamePage() {
  const result: ReactNode[] = [];
  const { openedWsPaths } = useWorkspaceContext();
  const { widescreen } = useUIManagerContext();

  if (!openedWsPaths.hasSomeOpenedWsPaths()) {
    return <EmptyEditorPage />;
  }

  openedWsPaths.forEachWsPath((wsPath, i) => {
    // avoid split screen for small screens
    if (!widescreen && i > 0) {
      return;
    }
    result.push(
      <EditorContainer
        key={i}
        widescreen={widescreen}
        editorId={i}
        wsPath={wsPath}
      />,
    );
  });

  return <MultiColumnMainContent>{result}</MultiColumnMainContent>;
}
