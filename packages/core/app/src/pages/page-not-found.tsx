import { usePlatformService } from '@bangle.io/context';
import React from 'react';
// import { useLocation, useSearch } from 'wouter';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageNotFound() {
  // const [location] = useLocation();
  // const [search] = useSearch();

  const platform = usePlatformService();
  return (
    <>
      <PageHeaderWrapper>
        <h1>Page Not Found</h1>
      </PageHeaderWrapper>
      <PageMainContentWrapper>
        <p>Not found.</p>
      </PageMainContentWrapper>
    </>
  );
}
