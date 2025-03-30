import { useCoreServices } from '@bangle.io/context';
import { useAtomValue } from 'jotai';
import React from 'react';
import { Actions } from '../components/actions';
import { getRelativeTimeOrNull } from '../components/get-relative-time';
import { ItemList } from '../components/item-list';
import { PageHeader } from '../components/page-header';
import { PageHeaderWrapper } from '../components/page-header-wrapper';
import { PageMainContentWrapper } from '../components/page-main-content-wrapper';
import { Section } from '../components/section';

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
  }, [workspaces, navigation.toUri]);

  const welcomeMessage = isNewUser ? 'Welcome to Bangle!' : 'Welcome back!';

  return (
    <>
      <PageHeaderWrapper />
      <PageMainContentWrapper>
        <Section hasPadding={false}>
          <PageHeader title={welcomeMessage} />
          <ItemList
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
        </Section>
      </PageMainContentWrapper>
    </>
  );
}
