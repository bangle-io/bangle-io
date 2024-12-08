import React from 'react';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageNativeFsAuthFailed() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>We were unable to get permission for </h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <div>
          <h1>We were unable to get permission for </h1>
        </div>
      </PageMainContentWrapper>
    </>
  );
}
