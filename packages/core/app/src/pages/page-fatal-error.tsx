import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { NoticeView } from '../components/NoticeView';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { Section } from '../components/section';

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
