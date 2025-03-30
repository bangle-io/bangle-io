import { useCoreServices } from '@bangle.io/context';
import { Breadcrumb, Button, DropdownMenu } from '@bangle.io/ui-components';
import { WsPath } from '@bangle.io/ws-path';
import { Folder, PlusIcon } from 'lucide-react';
import React from 'react';

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

export interface BreadcrumbSegment {
  label: string;
  wsPath: string;
}

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
  const { navigation } = useCoreServices();
  return (
    <DropdownMenu.DropdownMenuItem asChild>
      <Breadcrumb.BreadcrumbLink
        href={navigation.toUri({
          route: 'editor',
          payload: { wsPath: file.wsPath },
        })}
      >
        <>
          <span>{file.label}</span>
          {file.isCurrent && (
            <span className="ml-2 inline-block h-2 w-2 rounded-full bg-pop" />
          )}
        </>
      </Breadcrumb.BreadcrumbLink>
    </DropdownMenu.DropdownMenuItem>
  );
}

function getSiblingFiles(
  segment: BreadcrumbSegment,
  wsPaths: string[],
  currentWsPath: string,
): (BreadcrumbSegment & { isCurrent?: boolean })[] {
  const segmentPath = WsPath.fromString(segment.wsPath);
  const parentDir = segmentPath.getParent();

  return wsPaths
    .filter((path) => {
      const wsPathObj = WsPath.fromString(path);
      const filePath = wsPathObj.asFile();
      if (!filePath || wsPathObj.wsName !== segmentPath.wsName) return false;
      const pathParent = filePath.getParent();
      return pathParent?.path === parentDir?.path;
    })
    .map((path) => {
      const wsPathObj = WsPath.fromString(path);
      const filePath = wsPathObj.asFile();
      return {
        label: filePath?.fileName || '',
        wsPath: path,
        isCurrent: path === currentWsPath,
      };
    });
}
