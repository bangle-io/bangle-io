import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageFatalError() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>Unexpected Error</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <EmptyState title="Fatal Error" message={<FunMissing />} />
      </PageMainContentWrapper>
    </>
  );
}
