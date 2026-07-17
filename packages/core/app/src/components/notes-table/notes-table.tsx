import { useCoreServices } from '@bangle.io/context';
import {
  Button,
  cn,
  DropdownMenu,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@bangle.io/ui-components';
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { useAtom } from 'jotai';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  EllipsisVertical,
  FileText,
  FolderInput,
  FolderOpen,
  Link as LinkIcon,
  Pencil,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import React from 'react';
import { getTimestampDisplay } from '../../common/get-relative-time';

export interface NotesTableNote {
  wsPath: string;
  /** Display name, without the markdown extension. */
  fileName: string;
  /** Parent folder path without trailing slash; empty string at the root. */
  dirPath: string;
  href: string;
  isStarred: boolean;
  lastOpenedAt: number | undefined;
  createdAt: number | undefined;
  modifiedAt: number | undefined;
}

export interface NotesTableProps {
  notes: NotesTableNote[];
}

/**
 * Columns hidden unless the user opts in via the columns dropdown. The
 * user's choices persist through `$notesTableColumnVisibility`.
 */
const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
  lastOpenedAt: false,
  createdAt: false,
};

const DEFAULT_SORTING: SortingState = [{ id: 'modifiedAt', desc: true }];

function getColumnLabel(columnId: string): string {
  switch (columnId) {
    case 'name':
      return t.app.components.notesTable.nameColumn;
    case 'location':
      return t.app.components.notesTable.locationColumn;
    case 'modifiedAt':
      return t.app.components.notesTable.modifiedColumn;
    case 'lastOpenedAt':
      return t.app.components.notesTable.lastOpenedColumn;
    case 'createdAt':
      return t.app.components.notesTable.createdColumn;
    default:
      return columnId;
  }
}

function SortableHeaderButton({
  columnId,
  sortDirection,
  onToggle,
}: {
  columnId: string;
  sortDirection: false | 'asc' | 'desc';
  onToggle: () => void;
}) {
  const label = getColumnLabel(columnId);
  const SortIcon =
    sortDirection === 'asc'
      ? ArrowUp
      : sortDirection === 'desc'
        ? ArrowDown
        : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2 data-[sorted=true]:text-foreground"
      data-sorted={sortDirection !== false}
      onClick={onToggle}
      aria-label={t.app.components.notesTable.sortSr({ column: label })}
    >
      {label}
      <SortIcon
        className={cn(
          'ml-1 h-3.5 w-3.5',
          sortDirection === false && 'text-muted-foreground/60',
        )}
      />
    </Button>
  );
}

function TimestampCell({ timestamp }: { timestamp: number | undefined }) {
  const display = getTimestampDisplay(timestamp);
  if (timestamp === undefined || display === null) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  return (
    <span
      className="text-muted-foreground"
      title={new Date(timestamp).toLocaleString()}
    >
      {display}
    </span>
  );
}

function NoteRowActions({ note }: { note: NotesTableNote }) {
  const coreServices = useCoreServices();
  const strings = t.app.components.notesTable;

  return (
    <DropdownMenu.DropdownMenu>
      <DropdownMenu.DropdownMenuTrigger
        render={
          <Button
            aria-label={strings.rowActionsSr({ fileName: note.fileName })}
            className="h-7 w-7 p-0 text-muted-foreground"
            size="icon"
            variant="ghost"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenu.DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenu.DropdownMenuItem render={<a href={note.href} />}>
          <FolderOpen className="mr-2 h-4 w-4" />
          <span>{strings.openAction}</span>
        </DropdownMenu.DropdownMenuItem>
        <DropdownMenu.DropdownMenuItem
          onClick={() =>
            coreServices.commandDispatcher.dispatch(
              'command::workspace:toggle-star',
              { wsPath: note.wsPath },
              'ui',
            )
          }
        >
          <Star className="mr-2 h-4 w-4" />
          <span>
            {note.isStarred ? strings.unstarAction : strings.starAction}
          </span>
        </DropdownMenu.DropdownMenuItem>
        <DropdownMenu.DropdownMenuItem
          onClick={() =>
            coreServices.commandDispatcher.dispatch(
              'command::ui:rename-note-dialog',
              { wsPath: note.wsPath },
              'ui',
            )
          }
        >
          <Pencil className="mr-2 h-4 w-4" />
          <span>{strings.renameAction}</span>
        </DropdownMenu.DropdownMenuItem>
        <DropdownMenu.DropdownMenuItem
          onClick={() =>
            coreServices.commandDispatcher.dispatch(
              'command::ui:move-note-dialog',
              { wsPath: note.wsPath },
              'ui',
            )
          }
        >
          <FolderInput className="mr-2 h-4 w-4" />
          <span>{strings.moveAction}</span>
        </DropdownMenu.DropdownMenuItem>
        <DropdownMenu.DropdownMenuItem
          onClick={() =>
            coreServices.commandDispatcher.dispatch(
              'command::ui:copy-workspace-path',
              { wsPath: note.wsPath },
              'ui',
            )
          }
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          <span>{strings.copyPathAction}</span>
        </DropdownMenu.DropdownMenuItem>
        <DropdownMenu.DropdownMenuSeparator />
        <DropdownMenu.DropdownMenuItem
          variant="destructive"
          onClick={() =>
            coreServices.commandDispatcher.dispatch(
              'command::ui:delete-note-dialog',
              { wsPath: note.wsPath },
              'ui',
            )
          }
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>{strings.deleteAction}</span>
        </DropdownMenu.DropdownMenuItem>
      </DropdownMenu.DropdownMenuContent>
    </DropdownMenu.DropdownMenu>
  );
}

function buildColumns(): ColumnDef<NotesTableNote>[] {
  return [
    {
      id: 'name',
      accessorFn: (note) => note.fileName,
      enableHiding: false,
      sortingFn: 'alphanumeric',
      header: ({ column }) => (
        <SortableHeaderButton
          columnId="name"
          sortDirection={column.getIsSorted()}
          onToggle={() => column.toggleSorting()}
        />
      ),
      cell: ({ row }) => (
        <a
          href={row.original.href}
          className="flex max-w-96 items-center gap-2 font-medium hover:underline"
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{row.original.fileName}</span>
          {row.original.isStarred && (
            <>
              <Star className="h-3.5 w-3.5 shrink-0 fill-current text-yellow-500" />
              <span className="sr-only">
                {t.app.components.notesTable.starredIndicatorSr}
              </span>
            </>
          )}
        </a>
      ),
    },
    {
      id: 'location',
      accessorFn: (note) => note.dirPath,
      sortingFn: 'alphanumeric',
      header: ({ column }) => (
        <SortableHeaderButton
          columnId="location"
          sortDirection={column.getIsSorted()}
          onToggle={() => column.toggleSorting()}
        />
      ),
      cell: ({ row }) =>
        row.original.dirPath ? (
          <span className="max-w-56 truncate text-muted-foreground">
            {row.original.dirPath}
          </span>
        ) : (
          <span className="text-muted-foreground/60">—</span>
        ),
    },
    {
      id: 'modifiedAt',
      accessorFn: (note) => note.modifiedAt,
      sortingFn: 'basic',
      sortUndefined: 'last',
      sortDescFirst: true,
      header: ({ column }) => (
        <SortableHeaderButton
          columnId="modifiedAt"
          sortDirection={column.getIsSorted()}
          onToggle={() => column.toggleSorting()}
        />
      ),
      cell: ({ row }) => <TimestampCell timestamp={row.original.modifiedAt} />,
    },
    {
      id: 'lastOpenedAt',
      accessorFn: (note) => note.lastOpenedAt,
      sortingFn: 'basic',
      sortUndefined: 'last',
      sortDescFirst: true,
      header: ({ column }) => (
        <SortableHeaderButton
          columnId="lastOpenedAt"
          sortDirection={column.getIsSorted()}
          onToggle={() => column.toggleSorting()}
        />
      ),
      cell: ({ row }) => (
        <TimestampCell timestamp={row.original.lastOpenedAt} />
      ),
    },
    {
      id: 'createdAt',
      accessorFn: (note) => note.createdAt,
      sortingFn: 'basic',
      sortUndefined: 'last',
      sortDescFirst: true,
      header: ({ column }) => (
        <SortableHeaderButton
          columnId="createdAt"
          sortDirection={column.getIsSorted()}
          onToggle={() => column.toggleSorting()}
        />
      ),
      cell: ({ row }) => <TimestampCell timestamp={row.original.createdAt} />,
    },
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <NoteRowActions note={row.original} />
        </div>
      ),
    },
  ];
}

function matchesNote(row: Row<NotesTableNote>, filterValue: string): boolean {
  const query = filterValue.trim().toLowerCase();
  if (!query) {
    return true;
  }
  const { fileName, dirPath } = row.original;
  return (
    fileName.toLowerCase().includes(query) ||
    dirPath.toLowerCase().includes(query)
  );
}

/**
 * Sortable, filterable table of notes. Used by the workspace home page today;
 * a folder view can reuse it by passing a pre-filtered `notes` array.
 */
export function NotesTable({ notes }: NotesTableProps) {
  const coreServices = useCoreServices();
  const strings = t.app.components.notesTable;

  const [sorting, setSorting] = React.useState<SortingState>(DEFAULT_SORTING);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [storedVisibility, setStoredVisibility] = useAtom(
    coreServices.workbenchState.$notesTableColumnVisibility,
  );
  const columnVisibility = React.useMemo(
    () => ({ ...DEFAULT_COLUMN_VISIBILITY, ...storedVisibility }),
    [storedVisibility],
  );

  const columns = React.useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data: notes,
    columns,
    state: { sorting, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(columnVisibility) : updater;
      setStoredVisibility(next);
    },
    globalFilterFn: (row, _columnId, filterValue) =>
      matchesNote(row, String(filterValue)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  const openNote = (wsPath: string) => {
    coreServices.navigation.goWsPath(wsPath);
  };

  const handleRowClick = (
    event: React.MouseEvent<HTMLTableRowElement>,
    wsPath: string,
  ) => {
    if (
      event.defaultPrevented ||
      (event.target instanceof Element &&
        event.target.closest('a, button, [role="menu"], [role="menuitem"]'))
    ) {
      return;
    }
    openNote(wsPath);
  };

  return (
    <div
      className="flex w-full flex-col gap-3"
      data-testid="ws-home-notes-table"
    >
      <div className="flex items-center justify-between gap-2">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={strings.searchPlaceholder}
          aria-label={strings.searchPlaceholder}
          className="max-w-60"
        />
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-muted-foreground text-sm sm:inline">
            {strings.noteCount({ count: notes.length })}
          </span>
          <DropdownMenu.DropdownMenu>
            <DropdownMenu.DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="h-8">
                  <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                  {strings.columnsButton}
                </Button>
              }
            />
            <DropdownMenu.DropdownMenuContent align="end" className="min-w-40">
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenu.DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(checked) =>
                      column.toggleVisibility(checked)
                    }
                  >
                    {getColumnLabel(column.id)}
                  </DropdownMenu.DropdownMenuCheckboxItem>
                ))}
            </DropdownMenu.DropdownMenuContent>
          </DropdownMenu.DropdownMenu>
        </div>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <TableRow
                  key={row.original.wsPath}
                  data-wspath={row.original.wsPath}
                  className="cursor-pointer"
                  onClick={(event) =>
                    handleRowClick(event, row.original.wsPath)
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      event.target === event.currentTarget
                    ) {
                      openNote(row.original.wsPath);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-20 text-center text-muted-foreground"
                >
                  {strings.noResultsMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
