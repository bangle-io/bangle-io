import React, { useEffect } from 'react';

import { notification, workspace } from '@bangle.io/api';
import { useBangleStoreContext } from '@bangle.io/bangle-store-context';
import {
  PRIMARY_EDITOR_INDEX,
  SECONDARY_EDITOR_INDEX,
  SEVERITY,
} from '@bangle.io/constants';
import { EditorContainer, MiniEditor } from '@bangle.io/editor-container';
import { useUIManagerContext } from '@bangle.io/slice-ui';
import { useWorkspaceContext } from '@bangle.io/slice-workspace';
import { MultiColumnMainContent } from '@bangle.io/ui-dhancha';

import { EmptyEditorPage } from './EmptyEditorPage';

export function WorkspacePage() {
  const bangleStore = useBangleStoreContext();
  const { openedWsPaths } = useWorkspaceContext();
  const { widescreen } = useUIManagerContext();

  const { primaryWsPath, secondaryWsPath, miniEditorWsPath } = openedWsPaths;

  let mini = null;

  if (miniEditorWsPath) {
    if (widescreen) {
      mini = <MiniEditor wsPath={miniEditorWsPath} />;
    }
  }

  useEffect(() => {
    if (miniEditorWsPath && !widescreen) {
      notification.showNotification({
        title: 'Mini Editor is not available in small screens',
        uid: 'mini-editor-not-available',
        severity: SEVERITY.WARNING,
        transient: true,
      })(bangleStore.state, bangleStore.dispatch);

      workspace.closeMiniEditor()(bangleStore.state, bangleStore.dispatch);
    }
  }, [miniEditorWsPath, bangleStore, widescreen]);

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
      {mini}
    </>
  );
}
