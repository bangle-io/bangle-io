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
  const showEllipsis = shouldShowEllipsis(segments);
  const visibleSegments = getVisibleSegments(segments);

  if (segments.length === 0) {
    return null;
  }

  return (
    <Breadcrumb.Breadcrumb>
      <Breadcrumb.BreadcrumbList>
        {visibleSegments.map((segment, idx) => {
          const isLast = idx === visibleSegments.length - 1;
          const showSeparator = !isLast;
          const isFirst = idx === 0;

          return (
            <React.Fragment key={segment.wsPath ?? segment.label}>
              <Breadcrumb.BreadcrumbItem>
                {isFirst ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                  >
                    <Breadcrumb.BreadcrumbLink
                      href={buildURL(
                        buildUrlPath.pageEditor({ wsPath: segment.wsPath }),
                      )}
                    >
                      <Folder size={16} />
                    </Breadcrumb.BreadcrumbLink>
                  </Button>
                ) : (
                  <DirectoryDropdown
                    segment={segment}
                    wsPaths={wsPaths}
                    onNewNote={onNewNote}
                  />
                )}
              </Breadcrumb.BreadcrumbItem>
              {showSeparator && (
                <>
                  <Breadcrumb.BreadcrumbSeparator />
                  {idx === 0 && showEllipsis && (
                    <Breadcrumb.BreadcrumbEllipsis />
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </Breadcrumb.BreadcrumbList>
    </Breadcrumb.Breadcrumb>
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
        <DropdownMenu.DropdownMenuItem
          onClick={() => onNewNote({ wsPath: segment.wsPath })}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          <span>New Note</span>
        </DropdownMenu.DropdownMenuItem>
        {siblingFiles.length > 0 && (
          <>
            <DropdownMenu.DropdownMenuSeparator />
            {siblingFiles.map((file) => (
              <DropdownMenu.DropdownMenuItem key={file.wsPath} asChild>
                <Breadcrumb.BreadcrumbLink
                  href={buildURL(
                    buildUrlPath.pageEditor({ wsPath: file.wsPath }),
                  )}
                >
                  {file.label}
                </Breadcrumb.BreadcrumbLink>
              </DropdownMenu.DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenu.DropdownMenuContent>
    </DropdownMenu.DropdownMenu>
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
