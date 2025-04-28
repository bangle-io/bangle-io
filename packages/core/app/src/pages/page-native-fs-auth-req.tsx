import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoticeView } from '../components/feedback/notice-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

export function PageNativeFsAuthReq() {
  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <NoticeView
            title={t.app.pageNativeFsAuthReq.title}
            description={<FunMissing />}
            actions={[
              {
                label: t.app.pageNativeFsAuthReq.authorizeButton,
                onClick: () => window.location.reload(),
              },
            ]}
          />
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
