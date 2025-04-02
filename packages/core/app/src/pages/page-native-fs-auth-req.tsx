import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { ContentSection } from '../components/content-section';
import { NoticeView } from '../components/notice-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageNativeFsAuthReq() {
  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <ContentSection>
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
      </PageMainContentWrapper>
    </>
  );
}
