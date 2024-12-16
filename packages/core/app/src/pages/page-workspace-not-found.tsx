import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { NoticeView } from '../components/NoticeView';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { Section } from '../components/section';

export function PageWorkspaceNotFound() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>Page Not Found</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <Section>
          <NoticeView
            title="Workspace Not Found"
            description={<FunMissing />}
          />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
