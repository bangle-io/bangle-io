import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { NoteNotFoundView } from '../components/feedback/note-not-found-view';
import { AppHeader } from '../layout/app-header';
import { MainContentContainer } from '../layout/main-content-container';

export function PageWsPathNotFound() {
  return (
    <>
      <AppHeader />
      <MainContentContainer>
        <ContentSection hasPadding>
          <NoteNotFoundView />
        </ContentSection>
      </MainContentContainer>
    </>
  );
}
