import { WsPath } from '@bangle.io/ws-path';

export interface BreadcrumbSegment {
  label: string;
  wsPath: string;
}

/** Determines if the breadcrumb should display an ellipsis for brevity. */
export function shouldShowEllipsis(segments: BreadcrumbSegment[]): boolean {
  return segments.length > 4;
}

/** Gets the segments to display in the breadcrumb, potentially truncating with ellipsis. */
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

/** Converts a WsPath string into an array of breadcrumb segments. */
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

export function getSiblingFiles(
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
        label: wsPath.name || t.app.common.unknown,
        wsPath: path,
        isCurrent: path === currentWsPath,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
