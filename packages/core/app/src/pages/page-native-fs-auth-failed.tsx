import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoticeView } from '../components/feedback/notice-view';
import { AppHeader } from '../layout/app-header';
import { MainContentContainer } from '../layout/main-content-container';

export function PageNativeFsAuthFailed() {
  return (
    <>
      <AppHeader />
      <MainContentContainer>
        <ContentSection hasPadding>
          <NoticeView
            title={t.app.pageNativeFsAuthFailed.title}
            description={<FunMissing />}
            actions={[
              {
                label: t.app.pageNativeFsAuthFailed.tryAgainButton,
                onClick: () => window.location.reload(),
              },
            ]}
          />
        </ContentSection>
      </MainContentContainer>
    </>
  );
}
