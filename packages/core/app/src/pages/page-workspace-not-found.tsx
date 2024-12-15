import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageWorkspaceNotFound() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>Page Not Found</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <EmptyState title="Workspace Not Found" message={<FunMissing />} />
      </PageMainContentWrapper>
    </>
  );
}
