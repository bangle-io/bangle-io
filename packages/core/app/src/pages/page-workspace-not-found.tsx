import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { ContentSection } from '../components/content-section';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { WorkspaceNotFoundView } from '../components/workspace-not-found-view';

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
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <ContentSection>
          {/* Use the dedicated component, passing the wsName */}
          <WorkspaceNotFoundView wsName={wsName} />
        </ContentSection>
      </PageMainContentWrapper>
    </>
  );
}
