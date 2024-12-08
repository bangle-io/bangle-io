import React from 'react';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageFatalError() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>Unexpected Error</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <div>
          <h1>Unexpected Error</h1>
        </div>
      </PageMainContentWrapper>
    </>
  );
}
