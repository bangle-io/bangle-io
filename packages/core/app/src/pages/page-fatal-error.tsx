import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import {
  NoticeView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

export function PageFatalError() {
  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section>
          <NoticeView title="Fatal Error" description={<FunMissing />} />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
