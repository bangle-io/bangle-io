import { useCoreServices } from '@bangle.io/context';
import { Button, DropdownMenu } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue, useSetAtom } from 'jotai';
import { ExternalLink, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import React from 'react';
import { getRelativeTimeOrNull } from '../common/get-relative-time';

type NoteCountState =
  | { status: 'loading' }
  | { status: 'ready'; count: number }
  | { status: 'error' };

export function WorkspacesSettingsPage() {
  const {
    commandDispatcher,
    fileSystem,
    navigation,
    userActivityService,
    workbenchState,
    workspaceState,
  } = useCoreServices();
  const workspaces = useAtomValue(workspaceState.$workspaces);
  // `$workspaces` returns a fresh array on every recompute, so memoize the name
  // list on a stable serialized key. This keeps `workspaceNames`' identity
  // stable when the set of names is unchanged, avoiding a note-count refetch of
  // every workspace on unrelated workspace-list recomputes. `\0` cannot appear
  // in a workspace name.
  const workspaceNamesKey = workspaces
    .map((workspace) => workspace.name)
    .join('\0');
  const workspaceNames = React.useMemo(
    () => (workspaceNamesKey ? workspaceNamesKey.split('\0') : []),
    [workspaceNamesKey],
  );
  const allRecentWsPaths = useAtomValue(userActivityService.$allRecentWsPaths);
  const fileListRevisionCount = useAtomValue(fileSystem.$fileListRevisionCount);
  const setAlertDialog = useSetAtom(workbenchState.$alertDialog);
  const noteCounts = useWorkspaceNoteCounts(
    workspaceNames,
    fileListRevisionCount,
  );

  const lastOpenedByWorkspace = React.useMemo(() => {
    const latest = new Map<string, number>();

    for (const item of allRecentWsPaths) {
      const result = WsPath.safeParse(item.wsPath);
      if (result.validationError || !result.data) {
        continue;
      }
      const wsName = result.data.wsName;
      const current = latest.get(wsName) ?? 0;
      if (item.timestamp > current) {
        latest.set(wsName, item.timestamp);
      }
    }

    return latest;
  }, [allRecentWsPaths]);

  const sortedWorkspaces = React.useMemo(
    () =>
      [...workspaces].sort((left, right) => {
        const leftOpened =
          lastOpenedByWorkspace.get(left.name) ?? left.lastModified;
        const rightOpened =
          lastOpenedByWorkspace.get(right.name) ?? right.lastModified;
        return rightOpened - leftOpened || left.name.localeCompare(right.name);
      }),
    [lastOpenedByWorkspace, workspaces],
  );

  const openCreateWorkspaceDialog = () => {
    commandDispatcher.dispatch(
      'command::ui:create-workspace-dialog',
      null,
      'ui',
    );
  };

  const requestDeleteWorkspace = (wsName: string) => {
    setAlertDialog({
      dialogId: `dialog::settings-delete-workspace-${wsName}`,
      title: t.app.dialogs.confirmDeleteWorkspace.title,
      tone: 'destructive',
      description: t.app.dialogs.confirmDeleteWorkspace.description({
        wsName,
      }),
      continueText: t.app.dialogs.confirmDeleteWorkspace.continueText,
      onContinue: () => {
        commandDispatcher.dispatch(
          'command::ws:delete-workspace',
          { wsName },
          'ui',
        );
      },
      onCancel: () => {},
    });
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-normal">
          <span aria-hidden className="inline-block h-px w-3 bg-border" />
          {t.app.settings.workspaces.sectionTitle}
        </h2>
        <Button
          className="h-6 gap-1 rounded-sm px-1.5 font-normal text-[11px] text-muted-foreground hover:text-foreground"
          onClick={openCreateWorkspaceDialog}
          size="sm"
          variant="ghost"
        >
          <Plus className="h-3 w-3" />
          <span>{t.app.settings.workspaces.newWorkspace}</span>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/80 text-card-foreground shadow-sm">
        {sortedWorkspaces.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <h3 className="font-medium text-sm">
              {t.app.settings.workspaces.emptyTitle}
            </h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {t.app.settings.workspaces.emptyDescription}
            </p>
          </div>
        ) : (
          sortedWorkspaces.map((workspace) => {
            const noteCount = noteCounts[workspace.name] ?? {
              status: 'loading' as const,
            };
            const lastOpened =
              lastOpenedByWorkspace.get(workspace.name) ??
              workspace.lastModified;
            const relativeLastOpened = lastOpened
              ? getRelativeTimeOrNull(lastOpened)
              : null;
            const workspaceHref = navigation.toUri({
              route: 'ws-home',
              payload: { wsName: workspace.name },
            });

            return (
              <div
                className="grid gap-3 border-border/60 border-t px-4 py-3.5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5"
                key={workspace.name}
              >
                <div className="min-w-0 space-y-1">
                  <a
                    className="block truncate font-medium text-foreground text-sm hover:underline"
                    href={workspaceHref}
                  >
                    {workspace.name}
                  </a>
                  <p className="text-muted-foreground text-xs">
                    {formatNoteCount(noteCount)}
                  </p>
                </div>

                <div className="min-w-36 text-muted-foreground text-xs sm:text-right">
                  <span>{t.app.settings.workspaces.lastOpened}</span>
                  <span aria-hidden> · </span>
                  <span title={lastOpened ? formatDateTime(lastOpened) : ''}>
                    {relativeLastOpened ??
                      t.app.settings.workspaces.neverOpened}
                  </span>
                </div>

                <WorkspaceActionsMenu
                  onDelete={() => requestDeleteWorkspace(workspace.name)}
                  openHref={workspaceHref}
                  wsName={workspace.name}
                />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function WorkspaceActionsMenu({
  wsName,
  openHref,
  onDelete,
}: {
  wsName: string;
  openHref: string;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu.DropdownMenu>
      <DropdownMenu.DropdownMenuTrigger
        render={
          <Button
            aria-label={t.app.settings.workspaces.actionsLabel({ wsName })}
            className="h-8 w-8 justify-self-start p-0 sm:justify-self-end"
            size="icon"
            variant="ghost"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenu.DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenu.DropdownMenuItem render={<a href={openHref} />}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>{t.app.settings.workspaces.openWorkspace}</span>
        </DropdownMenu.DropdownMenuItem>
        <DropdownMenu.DropdownMenuSeparator />
        <DropdownMenu.DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{t.app.settings.workspaces.deleteWorkspace}</span>
        </DropdownMenu.DropdownMenuItem>
      </DropdownMenu.DropdownMenuContent>
    </DropdownMenu.DropdownMenu>
  );
}

function useWorkspaceNoteCounts(
  workspaceNames: readonly string[],
  fileListRevisionCount: number,
): Record<string, NoteCountState> {
  const { fileSystem } = useCoreServices();
  const [noteCounts, setNoteCounts] = React.useState<
    Record<string, NoteCountState>
  >({});
  React.useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    // `fileListRevisionCount` bumps on file create/delete/rename (not on content
    // edits). Referencing it here keeps it a real effect dependency so the counts
    // refetch when the file list changes; it has no other use in the body.
    void fileListRevisionCount;

    setNoteCounts((previous) => {
      const next: Record<string, NoteCountState> = {};
      for (const wsName of workspaceNames) {
        next[wsName] = previous[wsName] ?? { status: 'loading' };
      }
      return next;
    });

    void Promise.all(
      workspaceNames.map(async (wsName) => {
        try {
          const files = await fileSystem.listNoteFiles(
            wsName,
            abortController.signal,
          );
          return [wsName, { status: 'ready', count: files.length }] as const;
        } catch {
          if (abortController.signal.aborted) {
            return [wsName, { status: 'loading' }] as const;
          }
          return [wsName, { status: 'error' }] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      setNoteCounts(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [fileSystem, fileListRevisionCount, workspaceNames]);

  return noteCounts;
}

function formatNoteCount(noteCount: NoteCountState) {
  switch (noteCount.status) {
    case 'ready':
      return t.app.settings.workspaces.noteCount({ count: noteCount.count });
    case 'error':
      return t.app.settings.workspaces.noteCountUnavailable;
    case 'loading':
      return t.app.settings.workspaces.noteCountLoading;
    default: {
      const _exhaustiveCheck: never = noteCount;
      return _exhaustiveCheck;
    }
  }
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}
