import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoticeView } from '../components/feedback/notice-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

export function PageNativeFsAuthFailed() {
  const coreServices = useCoreServices();
  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <NoticeView
            title={t.app.pageNativeFsAuthFailed.title}
            description={<FunMissing />}
            actions={[
              {
                label: t.app.pageNativeFsAuthFailed.tryAgainButton,
                onClick: () => window.location.reload(),
              },
              {
                label: t.app.common.home,
                variant: 'outline',
                onClick: () => coreServices.navigation.goHome(),
              },
            ]}
          />
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
