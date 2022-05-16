import React from 'react';

import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
} from '@bangle.io/constants';
import { EditorContainer, MiniEditor } from '@bangle.io/editor-container';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { MultiColumnMainContent } from '@bangle.io/ui-dhancha';

import { EmptyEditorPage } from './EmptyEditorPage';

export function WorkspacePage() {
  const { openedWsPaths } = useWorkspaceContext();
  const { widescreen } = useUIManagerContext();

  const { primaryWsPath, secondaryWsPath, miniEditorWsPath } = openedWsPaths;

  return (
    <>
      <MultiColumnMainContent>
        {!primaryWsPath && !secondaryWsPath && <EmptyEditorPage />}
        {primaryWsPath && (
          <EditorContainer
            widescreen={widescreen}
            editorId={PRIMARY_EDITOR_INDEX}
            wsPath={primaryWsPath}
          />
        )}
        {/* avoid split screen for small screens */}
        {widescreen && secondaryWsPath && (
          <EditorContainer
            widescreen={widescreen}
            editorId={SECONDARY_EDITOR_INDEX}
            wsPath={secondaryWsPath}
          />
        )}
      </MultiColumnMainContent>
      {miniEditorWsPath && <MiniEditor wsPath={miniEditorWsPath} />}
    </>
  );
}
