import { APP_MAIN_CONTENT_PADDING } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { Editor } from '@bangle.io/editor';
import { useAtomValue } from 'jotai';
import React, { useMemo } from 'react';
import { NoteNotFoundView } from '../components/feedback/note-not-found-view';
import { WorkspaceNotFoundView } from '../components/feedback/workspace-not-found-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

const MAIN_EDITOR_NAME = 'main-editor';

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
          <Editor
            key={editorKey}
            name={editorKey}
            wsPath={currentWsPath.wsPath}
            className={APP_MAIN_CONTENT_PADDING}
          />
        ) : !currentWsName ? (
          <WorkspaceNotFoundView
            wsName={coreServices.navigation.resolveAtoms().wsName}
          />
        ) : (
          // NOTE: It is intentional we are not redirecting to the error page so that we avoid bouncing user
          <NoteNotFoundView />
        )}
      </PageContentContainer>
    </>
  );
}
