import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { NoticeView } from '../components/NoticeView';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { Section } from '../components/section';

export function PageNativeFsAuthReq() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>We were unable to get permission for </h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <Section>
          <NoticeView
            title="Authentication Required, Please allow access to continue"
            description={<FunMissing />}
            primaryActionLabel="Authorize"
            onPrimaryAction={() => window.location.reload()}
          />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
