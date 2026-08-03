import { useCoreServices } from '@bangle.io/context';
import {
  Breadcrumb,
  Button,
  buttonVariants,
  cn,
  DropdownMenu,
} from '@bangle.io/ui-components';
import { useAtomValue } from 'jotai';
import { Folder, PlusIcon } from 'lucide-react';
import React from 'react';
import {
  type BreadcrumbSegment,
  getSiblingFiles,
  getVisibleSegments,
  shouldShowEllipsis,
  wsPathToBreadcrumb,
} from './utils';

interface NoteBreadcrumbProps {
  wsPath: string;
  wsPaths: string[];
  onNewNote: (opts: { wsPath: string }) => void;
}

/** Renders the breadcrumb navigation for the current note path. */
export function NoteBreadcrumb({
  wsPath,
  wsPaths,
  onNewNote,
}: NoteBreadcrumbProps) {
  const segments = React.useMemo(() => wsPathToBreadcrumb(wsPath), [wsPath]);
  const visibleSegments = getVisibleSegments(segments);
  const showEllipsisFlag = shouldShowEllipsis(segments);

  return (
    <Breadcrumb.Breadcrumb className="min-w-0 flex-1 overflow-hidden">
      <Breadcrumb.BreadcrumbList className="min-w-0 flex-nowrap overflow-hidden">
        {visibleSegments.map((segment, idx) => (
          <BreadcrumbItem
            key={segment.wsPath ?? segment.label}
            segment={segment}
            isFirst={idx === 0}
            isLast={idx === visibleSegments.length - 1}
            showEllipsis={idx === 0 && showEllipsisFlag}
            wsPaths={wsPaths}
            onNewNote={onNewNote}
            currentWsPath={wsPath}
          />
        ))}
      </Breadcrumb.BreadcrumbList>
    </Breadcrumb.Breadcrumb>
  );
}

interface BreadcrumbItemProps {
  segment: BreadcrumbSegment;
  isFirst: boolean;
  isLast: boolean;
  showEllipsis: boolean;
  wsPaths: string[];
  onNewNote: (opts: { wsPath: string }) => void;
  currentWsPath: string;
}

function BreadcrumbItem({
  segment,
  isFirst,
  isLast,
  showEllipsis,
  wsPaths,
  onNewNote,
  currentWsPath,
}: BreadcrumbItemProps) {
  return (
    <React.Fragment>
      <Breadcrumb.BreadcrumbItem
        className={cn(
          isFirst ? 'shrink-0' : 'min-w-0',
          !isLast && 'hidden md:inline-flex',
          isLast &&
            'flex-1 overflow-hidden md:flex-[0_1_auto] md:overflow-visible',
        )}
      >
        {isFirst ? (
          <HomeFolderLink />
        ) : (
          <DirectoryDropdown
            segment={segment}
            wsPaths={wsPaths}
            currentWsPath={currentWsPath}
            onNewNote={onNewNote}
          />
        )}
      </Breadcrumb.BreadcrumbItem>
      {!isLast && (
        <Breadcrumb.BreadcrumbSeparator className="hidden shrink-0 md:list-item" />
      )}
      {showEllipsis && (
        <>
          <Breadcrumb.BreadcrumbEllipsis className="hidden md:flex" />
          <Breadcrumb.BreadcrumbSeparator className="hidden shrink-0 md:list-item" />
        </>
      )}
    </React.Fragment>
  );
}

function HomeFolderLink() {
  const { navigation } = useCoreServices();
  const wsName = useAtomValue(navigation.$wsName);
  return (
    <Breadcrumb.BreadcrumbLink
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'h-7 w-7',
      )}
      href={navigation.toUri(
        wsName
          ? {
              route: 'ws-home',
              payload: { wsName },
            }
          : {
              route: 'welcome',
              payload: {},
            },
      )}
      title={t.app.common.home}
    >
      <Folder size={16} />
    </Breadcrumb.BreadcrumbLink>
  );
}

interface DirectoryDropdownProps {
  segment: BreadcrumbSegment;
  wsPaths: string[];
  onNewNote: NoteBreadcrumbProps['onNewNote'];
  currentWsPath: string;
}

function DirectoryDropdown({
  segment,
  wsPaths,
  onNewNote,
  currentWsPath,
}: DirectoryDropdownProps) {
  const siblingFiles = React.useMemo(
    () => getSiblingFiles(segment, wsPaths, currentWsPath),
    [segment, wsPaths, currentWsPath],
  );

  return (
    <DropdownMenu.DropdownMenu>
      <DropdownMenu.DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto min-w-0 max-w-full shrink cursor-pointer truncate px-1 py-0 text-sm hover:underline"
          >
            {segment.label}
          </Button>
        }
      />
      <DropdownMenu.DropdownMenuContent
        align="start"
        className="max-h-[400px] max-w-[300px] overflow-y-auto"
      >
        <NewNoteMenuItem segment={segment} onNewNote={onNewNote} />
        {siblingFiles.length > 0 && (
          <>
            <DropdownMenu.DropdownMenuSeparator />
            {siblingFiles.map((file) => (
              <SiblingFileMenuItem key={file.wsPath} file={file} />
            ))}
          </>
        )}
      </DropdownMenu.DropdownMenuContent>
    </DropdownMenu.DropdownMenu>
  );
}

interface NewNoteMenuItemProps {
  segment: BreadcrumbSegment;
  onNewNote: NoteBreadcrumbProps['onNewNote'];
}

function NewNoteMenuItem({ segment, onNewNote }: NewNoteMenuItemProps) {
  return (
    <DropdownMenu.DropdownMenuItem
      onClick={() => onNewNote({ wsPath: segment.wsPath })}
    >
      <PlusIcon className="mr-2 h-4 w-4" />
      <span>{t.app.common.newNote}</span>
    </DropdownMenu.DropdownMenuItem>
  );
}

interface SiblingFileMenuItemProps {
  file: BreadcrumbSegment & { isCurrent?: boolean };
}

function SiblingFileMenuItem({ file }: SiblingFileMenuItemProps) {
  const coreServices = useCoreServices();
  return (
    <DropdownMenu.DropdownMenuItem
      className={file.isCurrent ? 'font-medium text-foreground' : ''}
      render={
        <Breadcrumb.BreadcrumbLink
          href={coreServices.navigation.toUri({
            route: 'editor',
            payload: { wsPath: file.wsPath },
          })}
          className="flex w-full items-center justify-between"
        />
      }
    >
      <span className="truncate">{file.label}</span>
      {file.isCurrent && (
        <span className="ml-2 inline-block h-2 w-2 shrink-0 rounded-full bg-primary" /> // Use primary color
      )}
    </DropdownMenu.DropdownMenuItem>
  );
}
