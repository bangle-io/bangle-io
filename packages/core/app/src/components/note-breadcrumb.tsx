import { useCoreServices } from '@bangle.io/context';
import { Breadcrumb, Button, DropdownMenu } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { Folder, PlusIcon } from 'lucide-react';
import React from 'react';

// Moved from breadcrumb-segment.ts
export interface BreadcrumbSegment {
  label: string;
  wsPath: string;
}

// Moved from breadcrumb-utils.ts
export function shouldShowEllipsis(segments: BreadcrumbSegment[]): boolean {
  return segments.length > 4;
}

export function getVisibleSegments(
  segments: BreadcrumbSegment[],
): BreadcrumbSegment[] {
  if (!shouldShowEllipsis(segments)) {
    return segments;
  }
  const first = segments[0];
  if (!first) {
    return [];
  }
  return [first, ...segments.slice(-2)];
}

// Moved from ws-path-to-breadcrumb.ts
export function wsPathToBreadcrumb(wsPath: string): BreadcrumbSegment[] {
  let path = WsPath.fromString(wsPath);

  const segments: BreadcrumbSegment[] = [
    {
      label: path.name || path.wsName,
      wsPath: path.wsPath,
    },
  ];

  if (!path.path) {
    return segments;
  }

  while (true) {
    const parent = path.getParent();
    if (!parent) {
      break;
    }
    segments.unshift({
      label: parent.name || path.wsName,
      wsPath: parent.wsPath,
    });
    path = parent;
  }

  return segments;
}

interface NoteBreadcrumbProps {
  wsPath: string;
  wsPaths: string[];
  onNewNote: (opts: { wsPath: string }) => void;
}

export function NoteBreadcrumb({
  wsPath,
  wsPaths,
  onNewNote,
}: NoteBreadcrumbProps) {
  const segments = React.useMemo(() => wsPathToBreadcrumb(wsPath), [wsPath]);
  const visibleSegments = getVisibleSegments(segments);

  return (
    <Breadcrumb.Breadcrumb>
      <Breadcrumb.BreadcrumbList>
        {visibleSegments.map((segment, idx) => (
          <BreadcrumbItem
            key={segment.wsPath ?? segment.label}
            segment={segment}
            isFirst={idx === 0}
            isLast={idx === visibleSegments.length - 1}
            showEllipsis={shouldShowEllipsis(segments)}
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
      <Breadcrumb.BreadcrumbItem>
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
        <>
          <Breadcrumb.BreadcrumbSeparator />
          {isFirst && showEllipsis && <Breadcrumb.BreadcrumbEllipsis />}
        </>
      )}
    </React.Fragment>
  );
}

function HomeFolderLink() {
  const { navigation } = useCoreServices();
  const { wsName } = navigation.resolveAtoms();
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
      <Breadcrumb.BreadcrumbLink
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
      >
        <Folder size={16} />
      </Breadcrumb.BreadcrumbLink>
    </Button>
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
      <DropdownMenu.DropdownMenuTrigger className="cursor-pointer hover:underline">
        {segment.label}
      </DropdownMenu.DropdownMenuTrigger>
      <DropdownMenu.DropdownMenuContent
        align="start"
        className="max-h-[400px] overflow-y-auto"
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
      <span>New Note</span>
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
      asChild
    >
      <a
        href={coreServices.navigation.toUri({
          route: 'editor',
          payload: { wsPath: file.wsPath },
        })}
      >
        {file.label}
      </a>
    </DropdownMenu.DropdownMenuItem>
  );
}

function getSiblingFiles(
  segment: BreadcrumbSegment,
  wsPaths: string[],
  currentWsPath: string,
): (BreadcrumbSegment & { isCurrent?: boolean })[] {
  const segmentPath = WsPath.fromString(segment.wsPath);
  const parentPath = segmentPath.getParent();

  if (!parentPath) {
    return [];
  }

  return wsPaths
    .filter((path) => {
      const wsPath = WsPath.fromString(path);
      const parent = wsPath.getParent();
      return parent && parent.wsPath === parentPath.wsPath;
    })
    .map((path) => {
      const wsPath = WsPath.fromString(path);
      return {
        label: wsPath.name || 'Unknown',
        wsPath: path,
        isCurrent: path === currentWsPath,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
