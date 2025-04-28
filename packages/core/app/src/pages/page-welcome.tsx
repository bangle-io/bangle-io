import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { getRelativeTimeOrNull } from '../common/get-relative-time';
import { Actions } from '../components/common/actions';
import { ContentSection } from '../components/common/content-section';
import { PageHeader } from '../components/common/page-header';
import { ItemList } from '../components/lists/item-list';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

const MAX_RECENT_WORKSPACES = 5;

export function PageWelcome() {
  const { commandDispatcher, workspaceState, userActivityService, navigation } =
    useCoreServices();
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const isNewUser = useAtomValue(userActivityService.$isNewUser);

  const workspaceLinks = React.useMemo(() => {
    const sorted = workspaces
      .map((ws) => ({
        label: ws.name,
        href: navigation.toUri({
          route: 'ws-home',
          payload: { wsName: ws.name },
        }),
        relativeTime: getRelativeTimeOrNull(ws.lastModified),
        timestamp: ws.lastModified,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_RECENT_WORKSPACES);
    return sorted;
  }, [workspaces, navigation]); // Removed navigation.toUri dependency as it's stable per navigation instance

  const welcomeMessage = isNewUser
    ? t.app.pageWelcome.newUser
    : t.app.pageWelcome.regularUser;

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        <ContentSection hasPadding>
          <PageHeader title={welcomeMessage} />
          <ItemList // Use ItemList instead of PageItemList
            heading={t.app.pageWelcome.recentWorkspacesHeading}
            items={workspaceLinks}
            emptyMessage={t.app.pageWelcome.createWorkspacePrompt}
            showViewMore={workspaces.length > MAX_RECENT_WORKSPACES}
            onClickViewMore={() =>
              commandDispatcher.dispatch(
                'command::ui:switch-workspace',
                null,
                'ui',
              )
            }
          />
          <Actions
            actions={[
              {
                label: t.app.pageWorkspaceNotFound.createWorkspaceButton,
                onClick: () =>
                  commandDispatcher.dispatch(
                    'command::ui:create-workspace-dialog',
                    null,
                    'ui',
                  ),
              },
              {
                label: t.app.landingPage,
                variant: 'outline',
                onClick: () => window.open('https://bangle.io', '_blank'),
              },
            ]}
          />
        </ContentSection>
      </PageContentContainer>
    </>
  );
}
