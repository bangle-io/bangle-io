import type {
  AppRouteInfo,
  PrivacySafeErrorReport,
  PrivacySafeErrorType,
  PrivacySafeStackFrame,
} from '@bangle.io/types';

const SAFE_ERROR_TYPES = new Set<PrivacySafeErrorType>([
  'AggregateError',
  'DOMException',
  'Error',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
]);

const SAFE_ROUTES = new Set<AppRouteInfo['route']>([
  'asset',
  'editor',
  'not-found',
  'settings-general',
  'settings-workspaces',
  'welcome',
  'ws-home',
]);

const MAX_STACK_FRAMES = 40;
const STACK_LOCATION =
  /((?:https?|bangle|file):\/\/[^\s)]+|\/[^\s)]+):(\d+):(\d+)\)?$/;
const DEBUG_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUILD_ASSET_PATH = /^\/assets\/[a-zA-Z0-9._-]+\.(?:js|mjs)$/;
const SAFE_CONTEXT_VALUE = /^[a-zA-Z0-9._+/@-]{1,160}$/;
const REPORT_KEYS = [
  'capturedAt',
  'environment',
  'errorType',
  'frames',
  'id',
  'release',
  'route',
  'schemaVersion',
] as const;
const FRAME_KEYS = [
  'columnNumber',
  'debugId',
  'filename',
  'lineNumber',
] as const;

function getSafeErrorType(name: string): PrivacySafeErrorType {
  return SAFE_ERROR_TYPES.has(name as PrivacySafeErrorType)
    ? (name as PrivacySafeErrorType)
    : 'Error';
}

export function getPrivacySafeRoute(
  value: string | undefined,
): PrivacySafeErrorReport['route'] {
  return SAFE_ROUTES.has(value as AppRouteInfo['route'])
    ? (value as AppRouteInfo['route'])
    : 'unknown';
}

function getBuildAssetPath(filename: string): string | undefined {
  try {
    const url = new URL(filename, 'https://bangle.invalid');
    return BUILD_ASSET_PATH.test(url.pathname) ? url.pathname : undefined;
  } catch {
    return undefined;
  }
}

function matchStackFrameLocation(line: string): RegExpMatchArray | undefined {
  const trimmed = line.trim();
  const match = trimmed.match(STACK_LOCATION);
  if (!match) {
    return undefined;
  }
  const locationStart = match.index ?? -1;
  const firefoxPrefix = trimmed.slice(0, locationStart);
  const hasEngineFrameShape =
    trimmed.startsWith('at ') ||
    locationStart === 0 ||
    (firefoxPrefix.endsWith('@') && !firefoxPrefix.includes(':'));
  return hasEngineFrameShape ? match : undefined;
}

/**
 * Builds a trusted asset-to-debug-ID registry from snippets injected by the
 * Sentry Vite plugin. The stack strings never leave the browser; reports use
 * opaque aliases derived only from validated build IDs.
 */
export function getCurrentBuildAssetDebugIds(): ReadonlyMap<string, string> {
  const registry = new Map<string, string>();
  const rawDebugIds = (
    globalThis as typeof globalThis & {
      _sentryDebugIds?: Record<string, unknown>;
    }
  )._sentryDebugIds;
  if (!rawDebugIds) {
    return registry;
  }

  for (const [stack, value] of Object.entries(rawDebugIds)) {
    if (typeof value !== 'string' || !DEBUG_ID.test(value)) {
      continue;
    }
    for (const line of stack.split('\n')) {
      const match = matchStackFrameLocation(line);
      const assetPath = getBuildAssetPath(match?.[1] ?? '');
      if (assetPath) {
        registry.set(assetPath, value.toLowerCase());
        break;
      }
    }
  }

  return registry;
}

export function getPrivacySafeStackFrames(
  stack: string | undefined,
  buildAssetDebugIds: ReadonlyMap<
    string,
    string
  > = getCurrentBuildAssetDebugIds(),
): PrivacySafeStackFrame[] {
  if (!stack) {
    return [];
  }

  const frames: PrivacySafeStackFrame[] = [];
  for (const line of stack.split('\n')) {
    const match = matchStackFrameLocation(line);
    if (!match) {
      continue;
    }
    const assetPath = getBuildAssetPath(match[1] ?? '');
    const debugId = assetPath
      ? buildAssetDebugIds.get(assetPath)?.toLowerCase()
      : undefined;
    const lineNumber = Number(match[2]);
    const columnNumber = Number(match[3]);
    if (
      !debugId ||
      !DEBUG_ID.test(debugId) ||
      !Number.isSafeInteger(lineNumber) ||
      lineNumber <= 0 ||
      !Number.isSafeInteger(columnNumber) ||
      columnNumber <= 0
    ) {
      continue;
    }
    frames.push({
      columnNumber,
      debugId,
      filename: `/assets/bangle-${debugId}.js`,
      lineNumber,
    });
    if (frames.length === MAX_STACK_FRAMES) {
      break;
    }
  }

  return frames.reverse();
}

export function createPrivacySafeErrorReport(
  error: Error,
  context: {
    id: string;
    capturedAt: string;
    route: string | undefined;
    release: string;
    environment: string;
    buildAssetDebugIds?: ReadonlyMap<string, string>;
  },
): PrivacySafeErrorReport {
  let errorName = 'Error';
  let errorStack: string | undefined;
  try {
    errorName = typeof error.name === 'string' ? error.name : 'Error';
  } catch {
    // A custom Error subclass may expose a throwing getter.
  }
  try {
    errorStack = typeof error.stack === 'string' ? error.stack : undefined;
  } catch {
    // A custom Error subclass may expose a throwing getter.
  }

  return {
    schemaVersion: 2,
    id: context.id,
    capturedAt: context.capturedAt,
    errorType: getSafeErrorType(errorName),
    route: getPrivacySafeRoute(context.route),
    release: context.release,
    environment: context.environment,
    frames: getPrivacySafeStackFrames(
      errorStack,
      context.buildAssetDebugIds ?? getCurrentBuildAssetDebugIds(),
    ),
  };
}

export function isPrivacySafeErrorReport(
  value: unknown,
): value is PrivacySafeErrorReport {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const report = value as Partial<PrivacySafeErrorReport>;
  return (
    hasExactKeys(report, REPORT_KEYS) &&
    report.schemaVersion === 2 &&
    typeof report.id === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      report.id,
    ) &&
    typeof report.capturedAt === 'string' &&
    isCanonicalIsoDate(report.capturedAt) &&
    typeof report.errorType === 'string' &&
    SAFE_ERROR_TYPES.has(report.errorType as PrivacySafeErrorType) &&
    typeof report.route === 'string' &&
    (report.route === 'unknown' ||
      SAFE_ROUTES.has(report.route as AppRouteInfo['route'])) &&
    typeof report.release === 'string' &&
    SAFE_CONTEXT_VALUE.test(report.release) &&
    typeof report.environment === 'string' &&
    SAFE_CONTEXT_VALUE.test(report.environment) &&
    Array.isArray(report.frames) &&
    report.frames.length <= MAX_STACK_FRAMES &&
    report.frames.every(
      (frame) =>
        hasExactKeys(frame, FRAME_KEYS) &&
        typeof frame?.debugId === 'string' &&
        DEBUG_ID.test(frame.debugId) &&
        typeof frame?.filename === 'string' &&
        frame.filename === `/assets/bangle-${frame.debugId.toLowerCase()}.js` &&
        Number.isSafeInteger(frame.lineNumber) &&
        frame.lineNumber > 0 &&
        Number.isSafeInteger(frame.columnNumber) &&
        frame.columnNumber > 0,
    )
  );
}

function hasExactKeys(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const keys = Object.keys(value).sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
}

function isCanonicalIsoDate(value: string): boolean {
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}
