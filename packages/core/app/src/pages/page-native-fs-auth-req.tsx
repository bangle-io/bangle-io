import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { EmptyState } from '../components/EmptyState';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageNativeFsAuthReq() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>We were unable to get permission for </h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <EmptyState
          title="Authentication Required, Please allow access to continue"
          message={<FunMissing />}
          actionLabel="Authorize"
          onAction={() => window.location.reload()}
        />
      </PageMainContentWrapper>
    </>
  );
}
