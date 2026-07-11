import { useCoreServices } from '@bangle.io/context';
import { FolderSearch } from 'lucide-react';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoticeView } from '../components/feedback/notice-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

export function PageNativeFsRecovery({ wsName }: { wsName: string }) {
  const coreServices = useCoreServices();

  return (
    <>
      <AppHeader />
      <PageContentContainer testId="page-native-fs-recovery">
        <ContentSection hasPadding>
          <NoticeView
            title={t.app.pageNativeFsRecovery.title}
            description={t.app.pageNativeFsRecovery.description({ wsName })}
            illustration={
              <div className="flex items-center justify-center">
                <FolderSearch
                  className="h-24 w-24 stroke-[1.5] text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            }
            actions={[
              {
                label: t.app.pageNativeFsRecovery.locateFolderButton,
                onClick: () =>
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:reconnect-native-fs-workspace',
                    { wsName },
                    'ui',
                  ),
              },
              {
                label: t.app.pageNativeFsRecovery.switchWorkspaceButton,
                variant: 'outline',
                onClick: () =>
                  coreServices.commandDispatcher.dispatch(
                    'command::ui:switch-workspace',
                    null,
                    'ui',
                  ),
              },
            ]}
          />
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
