import React, { ReactNode } from 'react';

import { EditorContainer } from '@bangle.io/editor-container';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { MultiColumnMainContent } from '@bangle.io/ui-dhancha';

import { EmptyEditorPage } from './EmptyEditorPage';

export function WorkspacePage() {
  const { openedWsPaths } = useWorkspaceContext();
  const { widescreen } = useUIManagerContext();

  const { primaryWsPath, secondaryWsPath } = openedWsPaths;

  return (
    <MultiColumnMainContent>
      {!primaryWsPath && !secondaryWsPath && <EmptyEditorPage />}
      {primaryWsPath && (
        <EditorContainer
          widescreen={widescreen}
          editorId={0}
          wsPath={primaryWsPath}
        />
      )}
      {/* avoid split screen for small screens */}
      {widescreen && secondaryWsPath && (
        <EditorContainer
          widescreen={widescreen}
          editorId={1}
          wsPath={secondaryWsPath}
        />
      )}
    </MultiColumnMainContent>
  );
}
