import { useCoreServices } from '@bangle.io/context';
import { Button, FunMissing } from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import React from 'react';
import { Actions } from '../components/common/actions';
import { ContentSection } from '../components/common/content-section';
import { PageHeader } from '../components/common/page-header';
import { NoticeView } from '../components/feedback/notice-view';
import {
  NotesTable,
  type NotesTableNote,
} from '../components/notes-table/notes-table';
import { useNoteFileStats } from '../components/notes-table/use-note-file-stats';
import { AppHeader } from '../layout/app-header';
import { PageContentContainer } from '../layout/main-content-container';

/**
 * This is the home page for a given workspace. It lists every note in a
 * sortable, filterable table, alongside actions to create a new note or
 * switch workspace.
 */
export function PageWsHome() {
  const coreServices = useCoreServices();
  const currentWsName = useAtomValue(
    coreServices.workspaceState.$currentWsName,
  );
  const notes = useNotesTableData();

  const onNewNote = () =>
    coreServices.commandDispatcher.dispatch(
      'command::ui:create-note-dialog',
      { prefillName: undefined },
      'ui',
    );
  const onSwitchWorkspace = () =>
    coreServices.commandDispatcher.dispatch(
      'command::ui:switch-workspace',
      null,
      'ui',
    );

  return (
    <>
      <AppHeader />
      <PageContentContainer testId="page-ws-home">
        {currentWsName ? (
          notes.length > 0 ? (
            <ContentSection hasPadding>
              <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="wrap-anywhere min-w-0 font-semibold text-2xl tracking-tight">
                    {currentWsName}
                  </h2>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" onClick={onSwitchWorkspace}>
                      {t.app.pageWsHome.switchWorkspaceButton}
                    </Button>
                    <Button onClick={onNewNote}>
                      {t.app.pageWsHome.newNoteButton}
                    </Button>
                  </div>
                </div>
                <NotesTable notes={notes} />
              </div>
            </ContentSection>
          ) : (
            <ContentSection hasPadding>
              <PageHeader title={`${currentWsName}`} />
              <div className="py-4 text-center text-muted-foreground text-sm">
                {t.app.pageWsHome.noNotesMessage}
              </div>
              <Actions
                actions={[
                  {
                    label: t.app.pageWsHome.newNoteButton,
                    onClick: onNewNote,
                  },
                  {
                    label: t.app.pageWsHome.switchWorkspaceButton,
                    variant: 'outline',
                    onClick: onSwitchWorkspace,
                  },
                ]}
              />
            </ContentSection>
          )
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

/**
 * Assembles table rows from the note listing, user activity (last opened,
 * starred) and file stats. Rows are pre-ordered by last-opened recency so the
 * table shows a sensible order even before file stats stream in.
 */
function useNotesTableData(): NotesTableNote[] {
  const coreServices = useCoreServices();
  const noteWsPaths = useAtomValue(coreServices.workspaceState.$noteWsPaths);
  const allRecentWsPaths = useAtomValue(
    coreServices.userActivityService.$allRecentWsPaths,
  );
  const starredPaths = useAtomValue(
    coreServices.userActivityService.$starredWsPaths,
  );

  const wsPathStrings = React.useMemo(
    () => noteWsPaths.map((filePath) => filePath.wsPath),
    [noteWsPaths],
  );
  const stats = useNoteFileStats(wsPathStrings);

  return React.useMemo(() => {
    const lastOpenedByWsPath = new Map(
      allRecentWsPaths.map(({ wsPath, timestamp }) => [wsPath, timestamp]),
    );
    const starredSet = new Set(starredPaths);

    return noteWsPaths
      .map((filePath): NotesTableNote => {
        const stat = stats.get(filePath.wsPath);
        const parent = filePath.getParent();
        const dirPath =
          parent && !parent.isRoot ? parent.path.replace(/\/$/, '') : '';
        return {
          wsPath: filePath.wsPath,
          fileName: filePath.fileNameWithoutExtension,
          dirPath,
          href: coreServices.navigation.toUri({
            route: 'editor',
            payload: { wsPath: filePath.wsPath },
          }),
          isStarred: starredSet.has(filePath.wsPath),
          lastOpenedAt: lastOpenedByWsPath.get(filePath.wsPath),
          modifiedAt: stat?.mtime,
        };
      })
      .sort(
        (a, b) =>
          (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) ||
          a.fileName.localeCompare(b.fileName),
      );
  }, [
    noteWsPaths,
    allRecentWsPaths,
    starredPaths,
    stats,
    coreServices.navigation,
  ]);
}
