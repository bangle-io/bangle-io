import { useCoreServices } from '@bangle.io/context';
import React from 'react';
import {
  NoteNotFoundView,
  PageHeaderWrapper,
  PageMainContentWrapper,
  Section,
} from '../components';

export function PageWsPathNotFound() {
  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section>
          <NoteNotFoundView />
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
