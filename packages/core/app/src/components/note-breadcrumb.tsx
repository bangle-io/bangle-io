import { Breadcrumb, Button, DropdownMenu } from '@bangle.io/ui-components';
import {
  breakPathIntoParts,
  buildURL,
  buildUrlPath,
  filePathToWsPath,
  isFileWsPath,
  pathJoin,
  splitWsPath,
} from '@bangle.io/ws-path';
import { Folder, PlusIcon } from 'lucide-react';
// packages/core/app/src/components/NoteBreadcrumb.tsx
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
}

function BreadcrumbItem({
  segment,
  isFirst,
  isLast,
  showEllipsis,
  wsPaths,
  onNewNote,
}: BreadcrumbItemProps) {
  return (
    <React.Fragment>
      <Breadcrumb.BreadcrumbItem>
        {isFirst ? (
          <HomeFolderLink segment={segment} />
        ) : (
          <DirectoryDropdown
            segment={segment}
            wsPaths={wsPaths}
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

interface HomeFolderLinkProps {
  segment: BreadcrumbSegment;
}

function HomeFolderLink({ segment }: HomeFolderLinkProps) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
      <Breadcrumb.BreadcrumbLink
        href={buildURL(buildUrlPath.pageEditor({ wsPath: segment.wsPath }))}
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
  const [wsName, filePath] = splitWsPath(wsPath);
  const segments: BreadcrumbSegment[] = [
    { label: wsName, wsPath: filePathToWsPath({ wsName, inputPath: '' }) },
  ];

  if (!filePath) {
    return segments;
  }

  const parts = breakPathIntoParts(filePath).filter(Boolean);
  parts.forEach((part, idx) => {
    const currentPath = pathJoin(...parts.slice(0, idx + 1));
    segments.push({
      label: part,
      wsPath: filePathToWsPath({ wsName, inputPath: currentPath }),
    });
  });

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
}

function DirectoryDropdown({
  segment,
  wsPaths,
  onNewNote,
}: DirectoryDropdownProps) {
  const siblingFiles = React.useMemo(
    () => getSiblingFiles(segment, wsPaths),
    [segment, wsPaths],
  );

  return (
    <DropdownMenu.DropdownMenu>
      <DropdownMenu.DropdownMenuTrigger className="cursor-pointer hover:underline">
        {segment.label}
      </DropdownMenu.DropdownMenuTrigger>
      <DropdownMenu.DropdownMenuContent align="start">
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
  file: BreadcrumbSegment;
}

function SiblingFileMenuItem({ file }: SiblingFileMenuItemProps) {
  return (
    <DropdownMenu.DropdownMenuItem asChild>
      <Breadcrumb.BreadcrumbLink
        href={buildURL(buildUrlPath.pageEditor({ wsPath: file.wsPath }))}
      >
        {file.label}
      </Breadcrumb.BreadcrumbLink>
    </DropdownMenu.DropdownMenuItem>
  );
}

function getSiblingFiles(
  segment: BreadcrumbSegment,
  wsPaths: string[],
): BreadcrumbSegment[] {
  const [wsName, dirPath] = splitWsPath(segment.wsPath);
  const dirParts = breakPathIntoParts(dirPath);
  const parentDir = pathJoin(...dirParts.slice(0, -1));

  return wsPaths
    .filter((path) => {
      const [pathWsName, pathFilePath] = splitWsPath(path);
      if (pathWsName !== wsName) return false;
      const pathDir = pathJoin(
        ...breakPathIntoParts(pathFilePath).slice(0, -1),
      );
      return (
        pathDir === parentDir && pathFilePath !== dirPath && isFileWsPath(path)
      );
    })
    .map((path) => {
      const [_, filePath] = splitWsPath(path);
      const label = breakPathIntoParts(filePath).pop() || '';
      return { label, wsPath: path };
    });
}
