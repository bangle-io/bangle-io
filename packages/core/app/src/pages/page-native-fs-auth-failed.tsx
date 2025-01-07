import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import {
  NoticeView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

export function PageNativeFsAuthFailed() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>We were unable to get permission for </h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <Section>
          <NoticeView
            title="Authentication Failed Please try again"
            description={<FunMissing />}
            primaryActionLabel="Try Again"
            onPrimaryAction={() => window.location.reload()}
          />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
