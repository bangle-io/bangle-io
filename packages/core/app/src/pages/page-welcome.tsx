import React from 'react';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageWelcome() {
  return (
    <>
      <PageHeaderWrapper>
        <h1>Bangle.io</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <div>
          <h1>Welcome!</h1>
        </div>
      </PageMainContentWrapper>
    </>
  );
}
