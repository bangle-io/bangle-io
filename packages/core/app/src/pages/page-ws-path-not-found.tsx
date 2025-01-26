import { useCoreServices } from '@bangle.io/context';
import React from 'react';
import {
  NotFoundView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

export function PageWsPathNotFound() {
  const coreServices = useCoreServices();

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section>
          <NotFoundView />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
