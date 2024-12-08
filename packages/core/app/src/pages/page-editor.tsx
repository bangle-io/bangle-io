import { useCoreServices } from '@bangle.io/context';
import { EditorComp } from '@bangle.io/editor';
import { resolvePath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';
import { EditorToolbar } from '../components/editor-toolbar';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageEditor() {
  const coreServices = useCoreServices();

  const wsPath = useAtomValue(coreServices.navigation.$wsPath);
  const $forceReloadCounter = useAtomValue(
    coreServices.editorService.$forceReloadCounter,
  );

  if (!wsPath) {
    return <div>Invalid path</div>;
  }

  return (
    <>
      <PageHeaderWrapper>
        <EditorToolbar />
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        {wsPath && (
          <EditorComp
            key={$forceReloadCounter}
            wsPath={wsPath}
            readNote={async (wsPath) => {
              return coreServices.fileSystem.readFileAsText(wsPath);
            }}
            writeNote={async (wsPath, content) => {
              const fileName = resolvePath(wsPath)?.fileName || '';

              void coreServices.fileSystem.createFile(
                wsPath,
                new File([content], fileName, {
                  type: 'text/plain',
                }),
              );
            }}
          />
        )}
      </PageMainContentWrapper>
    </>
  );
}
