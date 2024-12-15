import { FunMissing } from '@bangle.io/ui-components';
import React from 'react';
import { EmptyState } from '../components/EmptyState';

export function PageWsPathNotFound() {
  return <EmptyState title="Path Not Found" message={<FunMissing />} />;
}
