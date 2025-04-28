import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { ContentSection } from '../components/common/content-section';
import { WorkspaceNotFoundView } from '../components/feedback/workspace-not-found-view';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

export function PageWorkspaceNotFound() {
  const { navigation } = useCoreServices();
  // Extract wsName from the current route payload if the route matches
  const routeInfo = useAtomValue(navigation.$routeInfo);
  const wsName =
    routeInfo.route === 'workspace-not-found'
      ? routeInfo.payload.wsName
      : undefined;

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <WorkspaceNotFoundView wsName={wsName} />
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
