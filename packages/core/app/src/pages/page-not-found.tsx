import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import {
  NoticeView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

export function PageNotFound() {
  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section>
          <NoticeView title="Page Not Found" description={<FunMissing />} />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
