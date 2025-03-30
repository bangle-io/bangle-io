import { useCoreServices } from '@bangle.io/context';
import React from 'react';
import { NoteNotFoundView } from '../components/note-not-found-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { PageSection } from '../components/page-section';

export function PageWsPathNotFound() {
  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <PageSection>
          <NoteNotFoundView />
        </PageSection>
      </PageMainContentWrapper>
    </>
  );
}
