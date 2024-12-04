import { usePlatformService } from '@bangle.io/context';
import React from 'react';
// import { useLocation, useSearch } from 'wouter';

export function PageNotFound() {
  // const [location] = useLocation();
  // const [search] = useSearch();

  const platform = usePlatformService();
  return (
    <div>
      <h1>Page Not Found</h1>
      <p>Page editor content goes here.</p>
    </div>
  );
}
