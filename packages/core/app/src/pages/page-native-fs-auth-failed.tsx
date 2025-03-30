import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { NoticeView } from '../components/notice-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { PageSection } from '../components/page-section';

export function PageNativeFsAuthFailed() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>We were unable to get permission for </h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <PageSection>
          <NoticeView
            title="Authentication Failed Please try again"
            description={<FunMissing />}
            actions={[
              {
                label: 'Try Again',
                onClick: () => window.location.reload(),
              },
            ]}
          />
        </PageSection>
      </PageMainContentWrapper>
    </>
  );
}
