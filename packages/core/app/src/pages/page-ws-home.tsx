import { useCoreServices } from '@bangle.io/context';
import { FunMissing } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { Star as StarIcon } from 'lucide-react';
import React from 'react';
import { getRelativeTimeOrNull } from '../common/get-relative-time';
import { Actions } from '../components/common/actions';
import { ContentSection } from '../components/common/content-section';
import { PageHeader } from '../components/common/page-header';
import { NoticeView } from '../components/feedback/notice-view';
import { ItemList } from '../components/lists/item-list';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

const MAX_NOTES_TO_SHOW = 5;

/**
 * This is the home page for a given workspace.
 * It shows the recent notes, and actions to create a new note or switch workspace.
 */
export function PageWsHome() {
  const coreServices = useCoreServices();
  const currentWsName = useAtomValue(
    coreServices.workspaceState.$currentWsName,
  );
  const workspaceNotes = useWorkspaceNotes();
  const starredPaths = useAtomValue(
    coreServices.userActivityService.$starredWsPaths,
  );

  const notesWithTimeOrStar = React.useMemo(() => {
    const starredNotesRaw = workspaceNotes.filter((note) =>
      starredPaths.includes(note.wsPath),
    );

    const recentNotesRaw = workspaceNotes
      .slice(0, MAX_NOTES_TO_SHOW)
      .filter((note) => !starredPaths.includes(note.wsPath));

    const starredNotes = starredNotesRaw.map((note) => ({
      label: note.fileName,
      href: note.href,
      rightElement: (
        <StarIcon className="h-4 w-4 fill-current text-yellow-500" />
      ),
    }));

    const recentNotes = recentNotesRaw.map((note) => ({
      label: note.fileName,
      href: note.href,
      rightElement: note.timestamp ? (
        <span className="text-muted-foreground text-xs">
          {getRelativeTimeOrNull(note.timestamp)}
        </span>
      ) : null,
    }));

    return [...starredNotes, ...recentNotes];
  }, [workspaceNotes, starredPaths]);

  const noItemsMessage = t.app.pageWsHome.noNotesMessage;

  return (
    <>
      <AppHeader />
      <PageContentContainer testId="page-ws-home">
        {currentWsName ? (
          <ContentSection hasPadding>
            <PageHeader title={`${currentWsName}`} />
            <ItemList
              heading={t.app.pageWsHome.recentNotesHeading}
              items={notesWithTimeOrStar}
              emptyMessage={noItemsMessage}
              showViewMore={workspaceNotes.length > MAX_NOTES_TO_SHOW}
              onClickViewMore={() =>
                coreServices.commandDispatcher.dispatch(
                  'command::ui:toggle-omni-search',
                  { prefill: undefined },
                  'ui',
                )
              }
            />
            {(workspaceNotes.length === 0 ||
              notesWithTimeOrStar.length > 0) && (
              <Actions
                actions={[
                  {
                    label: t.app.pageWsHome.newNoteButton,
                    onClick: () =>
                      coreServices.commandDispatcher.dispatch(
                        'command::ui:create-note-dialog',
                        { prefillName: undefined },
                        'ui',
                      ),
                  },
                  {
                    label: t.app.pageWsHome.switchWorkspaceButton,
                    variant: 'outline',
                    onClick: () =>
                      coreServices.commandDispatcher.dispatch(
                        'command::ui:switch-workspace',
                        null,
                        'ui',
                      ),
                  },
                ]}
              />
            )}
          </ContentSection>
        ) : (
          <ContentSection hasPadding>
            <NoticeView
              title={t.app.pageWorkspaceNotFound.title}
              description={<FunMissing />}
              actions={[
                {
                  label: t.app.pageWorkspaceNotFound.createWorkspaceButton,
                  onClick: () =>
                    coreServices.commandDispatcher.dispatch(
                      'command::ui:create-workspace-dialog',
                      null,
                      'ui',
                    ),
                },
                {
                  label: t.app.pageWorkspaceNotFound.switchWorkspaceButton,
                  variant: 'outline',
                  onClick: () =>
                    coreServices.commandDispatcher.dispatch(
                      'command::ui:switch-workspace',
                      null,
                      'ui',
                    ),
                },
              ]}
            />
          </ContentSection>
        )}
      </PageContentContainer>
    </>
  );
}

/** Returns workspace notes ordered from most to least recently viewed. */
function useWorkspaceNotes() {
  const coreServices = useCoreServices();
  const allWsPaths = useAtomValue(coreServices.workspaceState.$noteWsPaths);
  const allRecentWsPaths = useAtomValue(
    coreServices.userActivityService.$allRecentWsPaths,
  );

  return React.useMemo(() => {
    const timestamps = new Map(
      allRecentWsPaths.map(({ wsPath, timestamp }) => [wsPath, timestamp]),
    );

    return allWsPaths
      .map((path) => ({
        wsPath: path.wsPath,
        timestamp: timestamps.get(path.wsPath) ?? 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((item) => {
        const wsPath = WsPath.fromString(item.wsPath);
        const filePath = wsPath.asFile();
        return {
          ...item,
          fileName: filePath?.fileName || item.wsPath,
          href: coreServices.navigation.toUri({
            route: 'editor',
            payload: { wsPath: item.wsPath },
          }),
        };
      });
  }, [allWsPaths, allRecentWsPaths, coreServices.navigation]);
}
