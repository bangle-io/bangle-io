import { APP_MAIN_CONTENT_PADDING } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { Editor } from '@bangle.io/editor';
import { FunMissing } from '@bangle.io/ui-components';
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
      <PageMainContentWrapper applyPadding={false}>
        {currentWsPath && currentWsName ? (
          <Editor
            key={$forceReloadCounter + currentWsPath}
            wsPath={currentWsPath}
            // Let editor manage its own padding to show the drag handle
            className={APP_MAIN_CONTENT_PADDING}
          />
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
