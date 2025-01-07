import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import {
  NoticeView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

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
