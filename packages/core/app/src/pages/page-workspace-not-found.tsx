import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { WorkspaceNotFoundView } from '../components/feedback/workspace-not-found-view';
import { AppHeader } from '../layout/app-header';
import { MainContentContainer } from '../layout/main-content-container';

export function PageWorkspaceNotFound() {
  const { navigation } = useCoreServices();
  // Extract wsName from the current route payload
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const wsName =
    routeInfo.route === 'workspace-not-found'
      ? routeInfo.payload.wsName
      : undefined;

  return (
    <>
      <AppHeader />
      <MainContentContainer>
        <ContentSection hasPadding>
          <WorkspaceNotFoundView wsName={wsName} />
        </ContentSection>
      </MainContentContainer>
    </>
  );
}
