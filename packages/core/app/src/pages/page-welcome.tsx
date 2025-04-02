import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { getRelativeTimeOrNull } from '../common/get-relative-time';
import { Actions } from '../components/actions';
import { ContentSection } from '../components/content-section';
import { PageHeader } from '../components/page-header';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageItemList } from '../components/page-item-list';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';

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
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <ContentSection hasPadding={false}>
          <PageHeader title={welcomeMessage} />
          <PageItemList
            heading="Recent workspaces"
            items={workspaceLinks}
            emptyMessage="Create a workspace to get started."
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
                label: 'New Workspace',
                onClick: () =>
                  commandDispatcher.dispatch(
                    'command::ui:create-workspace-dialog',
                    null,
                    'ui',
                  ),
              },
              {
                label: 'Landing page',
                variant: 'outline',
                onClick: () => window.open('https://bangle.io', '_blank'),
              },
            ]}
          />
        </ContentSection>
      </PageMainContentWrapper>
    </>
  );
}
