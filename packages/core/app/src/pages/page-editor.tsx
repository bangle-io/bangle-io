import { useCoreServices } from '@bangle.io/context';
import { Editor } from '@bangle.io/editor';
import { FunMissing } from '@bangle.io/ui-components';
import { resolvePath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';
import { NoticeView } from '../components/NoticeView';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

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

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        {currentWsPath && currentWsName ? (
          <Editor
            key={$forceReloadCounter}
            wsPath={currentWsPath}
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
          // <EditorComp

          // />
        ) : (
          <NoticeView
            title="Note not found"
            description={<FunMissing />}
            secondaryActions={[
              {
                label: 'New Note',
                onClick: () =>
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:create-note-dialog',
                    { prefillName: undefined },
                    'ui',
                  ),
              },
              {
                label: 'View All Notes',
                variant: 'outline',
                onClick: () =>
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:toggle-all-files',
                    { prefillInput: undefined },
                    'ui',
                  ),
              },
            ]}
          />
        )}
      </PageMainContentWrapper>
    </>
  );
}
