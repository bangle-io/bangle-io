import React from 'react';
import { ContentSection } from '../components/content-section';
import { NoteNotFoundView } from '../components/note-not-found-view';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

export function PageWsPathNotFound() {
  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <ContentSection>
          <NoteNotFoundView />
        </ContentSection>
      </PageMainContentWrapper>
    </>
  );
}
