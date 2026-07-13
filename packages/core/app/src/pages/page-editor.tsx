import { EDITOR_GUTTER_PADDING_LEFT } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { LinkedMentions } from '../components/backlinks/linked-mentions';
import { EditorSurface } from '../components/editor-surface';
import { NoteNotFoundView } from '../components/feedback/note-not-found-view';
import { WorkspaceNotFoundView } from '../components/feedback/workspace-not-found-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

const MAIN_EDITOR_NAME = 'main-editor';

// APP_MAIN_CONTENT_PADDING with the left side widened for the block handle.
const EDITOR_CONTENT_PADDING = `py-4 pt-0 pr-4 md:pr-6 ${EDITOR_GUTTER_PADDING_LEFT}`;

export function PageEditor() {
  const coreServices = useCoreServices();
  const currentWsPath = useAtomValue(
    coreServices.workspaceState.$currentWsPath,
  );
  const currentWsName = useAtomValue(
    coreServices.workspaceState.$currentWsName,
  );
  const $forceReloadCounter = useAtomValue(
    coreServices.editorService.$forceReloadCounter,
  );
  const routeWsName = useAtomValue(coreServices.navigation.$wsName);

  const editorKey = useMemo(() => {
    return currentWsPath
      ? `editor::${MAIN_EDITOR_NAME}:${currentWsPath.wsPath}:${$forceReloadCounter}`
      : `${MAIN_EDITOR_NAME}:${$forceReloadCounter}`;
  }, [currentWsPath, $forceReloadCounter]);

  return (
    <>
      <AppHeader />
      <PageContentContainer applyPadding={false}>
        {currentWsPath && currentWsName ? (
          <>
            <EditorSurface
              key={editorKey}
              name={editorKey}
              wsPath={currentWsPath.wsPath}
              className={EDITOR_CONTENT_PADDING}
            />
            <LinkedMentions currentWsPath={currentWsPath} />
          </>
        ) : !currentWsName ? (
          <WorkspaceNotFoundView wsName={routeWsName} />
        ) : (
          // NOTE: It is intentional we are not redirecting to the error page so that we avoid bouncing user
          <NoteNotFoundView />
        )}
      </PageContentContainer>
    </>
  );
}
