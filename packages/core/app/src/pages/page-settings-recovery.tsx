import {
  type NoteSnapshotMetadata,
  type NoteSnapshotRecord,
  useCoreServices,
} from '@bangle.io/context';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import { History, RotateCcw } from 'lucide-react';
import React from 'react';
import { getTimestampDisplay } from '../common/get-relative-time';

const ALL_WORKSPACES = '*';

type SnapshotListState =
  | { status: 'loading' }
  | { status: 'ready'; snapshots: NoteSnapshotMetadata[] }
  | { status: 'error' };

type PreviewState = {
  snapshotId: string;
  fileName: string;
  record: NoteSnapshotRecord | undefined;
  loading: boolean;
};

function snapshotDisplayPath(wsPath: string): {
  fileName: string;
  location: string;
} {
  const parsed = WsPath.safeParse(wsPath);
  const filePath = parsed.ok ? parsed.data?.asFile() : undefined;
  if (!filePath) {
    return { fileName: wsPath, location: '' };
  }
  return { fileName: filePath.fileName, location: wsPath };
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

export function RecoverySettingsPage() {
  const { commandDispatcher, noteSnapshot, workspaceState } = useCoreServices();
  const workspaces = useAtomValue(workspaceState.$workspaces);
  const [workspaceFilter, setWorkspaceFilter] = React.useState(ALL_WORKSPACES);
  const [search, setSearch] = React.useState('');
  const [listState, setListState] = React.useState<SnapshotListState>({
    status: 'loading',
  });
  const [preview, setPreview] = React.useState<PreviewState | undefined>();

  React.useEffect(() => {
    let cancelled = false;
    setListState({ status: 'loading' });
    noteSnapshot
      .listSnapshots(
        workspaceFilter === ALL_WORKSPACES
          ? undefined
          : { wsName: workspaceFilter },
      )
      .then((snapshots) => {
        if (!cancelled) {
          setListState({ status: 'ready', snapshots });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setListState({ status: 'error' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [noteSnapshot, workspaceFilter]);

  const filteredSnapshots = React.useMemo(() => {
    if (listState.status !== 'ready') {
      return [];
    }
    const query = search.trim().toLowerCase();
    if (!query) {
      return listState.snapshots;
    }
    return listState.snapshots.filter((snapshot) =>
      snapshot.wsPath.toLowerCase().includes(query),
    );
  }, [listState, search]);

  const openPreview = (snapshot: NoteSnapshotMetadata) => {
    const { fileName } = snapshotDisplayPath(snapshot.wsPath);
    setPreview({
      snapshotId: snapshot.id,
      fileName,
      record: undefined,
      loading: true,
    });
    void noteSnapshot.getSnapshot(snapshot.id).then((record) => {
      setPreview((current) =>
        current && current.snapshotId === snapshot.id
          ? { ...current, record, loading: false }
          : current,
      );
    });
  };

  const recoverSnapshot = (snapshotId: string) => {
    commandDispatcher.dispatch(
      'command::ws:recover-note-snapshot',
      { snapshotId },
      'ui',
    );
  };

  const workspaceItems: Record<string, string> = {
    [ALL_WORKSPACES]: t.app.settings.recovery.allWorkspaces,
    ...Object.fromEntries(
      workspaces.map((workspace) => [workspace.name, workspace.name]),
    ),
  };

  return (
    <section className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t.app.settings.recovery.description}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          aria-label={t.app.settings.recovery.searchLabel}
          className="sm:max-w-64"
          data-testid="settings-recovery-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.app.settings.recovery.searchPlaceholder}
          value={search}
        />
        {workspaces.length > 1 ? (
          <Select
            items={workspaceItems}
            onValueChange={(value) => {
              if (value) {
                setWorkspaceFilter(value);
              }
            }}
            value={workspaceFilter}
          >
            <SelectTrigger
              aria-label={t.app.settings.recovery.workspaceLabel}
              className="w-full sm:w-48"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-44">
              <SelectItem value={ALL_WORKSPACES}>
                {t.app.settings.recovery.allWorkspaces}
              </SelectItem>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.name} value={workspace.name}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card/80 text-card-foreground shadow-sm">
        {listState.status === 'loading' ? (
          <StatusMessage message={t.app.settings.recovery.loading} />
        ) : listState.status === 'error' ? (
          <StatusMessage message={t.app.settings.recovery.loadFailed} />
        ) : listState.snapshots.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <h3 className="flex items-center justify-center gap-2 font-medium text-sm">
              <History aria-hidden className="h-4 w-4" />
              {t.app.settings.recovery.emptyTitle}
            </h3>
            <p className="mt-1 text-muted-foreground text-sm">
              {t.app.settings.recovery.emptyDescription}
            </p>
          </div>
        ) : filteredSnapshots.length === 0 ? (
          <StatusMessage message={t.app.settings.recovery.noMatches} />
        ) : (
          <div className="overflow-x-auto">
            <Table data-testid="settings-recovery-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.app.settings.recovery.noteColumn}</TableHead>
                  <TableHead>{t.app.settings.recovery.timeColumn}</TableHead>
                  <TableHead className="text-right">
                    {t.app.settings.recovery.wordCountColumn}
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">
                      {t.app.settings.recovery.actionsColumn}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSnapshots.map((snapshot) => {
                  const { fileName, location } = snapshotDisplayPath(
                    snapshot.wsPath,
                  );
                  return (
                    <TableRow
                      data-testid="settings-recovery-row"
                      key={snapshot.id}
                    >
                      <TableCell className="max-w-64">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{fileName}</p>
                          {location ? (
                            <p className="truncate text-muted-foreground text-xs">
                              {location}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap text-muted-foreground"
                        title={formatDateTime(snapshot.createdAt)}
                      >
                        {getTimestampDisplay(snapshot.createdAt) ??
                          formatDateTime(snapshot.createdAt)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {snapshot.wordCount}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button
                          data-testid="settings-recovery-view"
                          onClick={() => openPreview(snapshot)}
                          size="sm"
                          variant="ghost"
                        >
                          {t.app.settings.recovery.viewAction}
                        </Button>
                        <Button
                          data-testid="settings-recovery-recover"
                          onClick={() => recoverSnapshot(snapshot.id)}
                          size="sm"
                          variant="outline"
                        >
                          <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                          {t.app.settings.recovery.recoverAction}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setPreview(undefined);
          }
        }}
        open={preview !== undefined}
      >
        <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {preview
                ? t.app.settings.recovery.previewTitle({
                    fileName: preview.fileName,
                  })
                : ''}
            </DialogTitle>
            {preview?.record ? (
              <DialogDescription>
                {formatDateTime(preview.record.createdAt)}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border bg-muted/30 p-3">
            {preview?.loading ? (
              <p className="text-muted-foreground text-sm">
                {t.app.settings.recovery.previewLoading}
              </p>
            ) : preview?.record ? (
              <pre
                className="whitespace-pre-wrap break-words font-mono text-sm"
                data-testid="settings-recovery-preview-content"
              >
                {preview.record.content}
              </pre>
            ) : (
              <p className="text-muted-foreground text-sm">
                {t.app.settings.recovery.previewUnavailable}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              data-testid="settings-recovery-preview-close"
              onClick={() => setPreview(undefined)}
              type="button"
              variant="ghost"
            >
              {t.app.settings.recovery.closeButton}
            </Button>
            {preview?.record ? (
              <Button
                data-testid="settings-recovery-dialog-recover"
                onClick={() => {
                  recoverSnapshot(preview.snapshotId);
                  setPreview(undefined);
                }}
                type="button"
              >
                <RotateCcw aria-hidden className="h-4 w-4" />
                {t.app.settings.recovery.recoverAsNewNote}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function StatusMessage({ message }: { message: string }) {
  return (
    <p className="px-5 py-8 text-center text-muted-foreground text-sm">
      {message}
    </p>
  );
}
