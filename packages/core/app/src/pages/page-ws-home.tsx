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
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * This is the home page for a given workspace.
 * It shows the recent notes, and actions to create a new note or switch workspace.
 */
export function PageWsHome() {
  const coreServices = useCoreServices();
  const currentWsName = useAtomValue(
    coreServices.workspaceState.$currentWsName,
  );
  const groups = useGroupedWorkspaceNotes();
  const starredPaths = useAtomValue(
    coreServices.userActivityService.$starredWsPaths,
  );

  // Prepare recent notes list (just top MAX_NOTES_TO_SHOW from "all" sorted)
  const allNotes = React.useMemo(() => {
    const notes = [...(groups.all || [])];
    return notes
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, MAX_NOTES_TO_SHOW);
  }, [groups]);

  const notesWithTimeOrStar = React.useMemo(() => {
    const starredNotesRaw = (groups.all || []).filter((note) =>
      starredPaths.includes(note.wsPath),
    );

    const recentNotesRaw = allNotes.filter(
      (note) => !starredPaths.includes(note.wsPath),
    );

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
  }, [allNotes, groups.all, starredPaths]);

  const noItemsMessage = t.app.pageWsHome.noNotesMessage;

  return (
    <>
      <AppHeader />
      <PageContentContainer>
        {currentWsName ? (
          <ContentSection hasPadding>
            <PageHeader title={`${currentWsName}`} />
            <ItemList
              heading={t.app.pageWsHome.recentNotesHeading}
              items={notesWithTimeOrStar}
              emptyMessage={noItemsMessage}
              showViewMore={groups.all && groups.all.length > MAX_NOTES_TO_SHOW}
              onClickViewMore={() =>
                coreServices.commandDispatcher.dispatch(
                  'command::ui:toggle-omni-search',
                  { prefill: undefined },
                  'ui',
                )
              }
            />
            {(groups.isEmpty || notesWithTimeOrStar.length > 0) && (
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

/** A hook that groups workspace notes into 'recently viewed', 'last 7 days', and 'all', based on user activity. */
function useGroupedWorkspaceNotes() {
  const coreServices = useCoreServices();
  const allWsPaths = useAtomValue(coreServices.workspaceState.$wsPaths);
  const recentWsPaths = useAtomValue(
    coreServices.userActivityService.$recentWsPaths,
  );
  const allRecentWsPaths = useAtomValue(
    coreServices.userActivityService.$allRecentWsPaths,
  );

  const sortedPathsWithTimestamp = React.useMemo(() => {
    return allWsPaths
      .map((wsPath): { wsPath: string; timestamp: number } => {
        const recentActivity = allRecentWsPaths.find(
          (r) => r.wsPath === wsPath.wsPath,
        );
        if (recentActivity) {
          return { wsPath: wsPath.wsPath, timestamp: recentActivity.timestamp };
        }
        return { wsPath: wsPath.wsPath, timestamp: 0 };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allWsPaths, allRecentWsPaths]);

  return React.useMemo(() => {
    // Get recent paths (top 5) with timestamps
    const recentOrdered = recentWsPaths
      .filter((p) => allWsPaths.some((wsPath) => wsPath.wsPath === p))
      .slice(0, 5)
      .map((wsPath) => ({
        wsPath: wsPath,
        timestamp:
          allRecentWsPaths.find((r) => r.wsPath === wsPath)?.timestamp || 0,
      }));

    const now = Date.now();
    const sevenDaysAgo = now - SEVEN_DAYS_MS;

    // Filter last 7 days excluding recent
    const last7days = sortedPathsWithTimestamp.filter(
      (item) =>
        item.timestamp >= sevenDaysAgo &&
        !recentOrdered.map((r) => r.wsPath).includes(item.wsPath),
    );

    const toLinkObj = (item: { wsPath: string; timestamp: number }) => {
      const wsPath = WsPath.fromString(item.wsPath);
      const filePath = wsPath.asFile();
      const fileName = filePath?.fileName || item.wsPath;
      const href = coreServices.navigation.toUri({
        route: 'editor',
        payload: { wsPath: item.wsPath },
      });
      return {
        wsPath: item.wsPath,
        fileName,
        href,
        timestamp: item.timestamp,
      };
    };
    const isEmpty =
      last7days.length === 0 &&
      sortedPathsWithTimestamp.length === 0 &&
      recentOrdered.length === 0;

    return {
      recently: recentOrdered.map(toLinkObj),
      last7days: last7days.map(toLinkObj),
      all: sortedPathsWithTimestamp.map(toLinkObj),
      isEmpty,
    };
  }, [
    allWsPaths,
    recentWsPaths,
    sortedPathsWithTimestamp,
    allRecentWsPaths,
    coreServices.navigation, // Use navigation directly as toUri might change if navigation changes
  ]);
}
