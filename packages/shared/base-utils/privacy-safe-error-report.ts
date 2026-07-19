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
const GENERATED_BUNDLE_NAME =
  /^([a-zA-Z0-9_-]+)-[a-zA-Z0-9_-]{6,}\.(?:js|mjs)$/;
const SAFE_BUNDLE_PREFIXES = new Set([
  'code-highlight-shiki',
  'core',
  'engine-javascript',
  'index',
]);
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
const FRAME_KEYS = ['columnNumber', 'filename', 'lineNumber'] as const;

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

function sanitizeFrameFilename(filename: string): string | undefined {
  try {
    const url = new URL(filename, 'https://bangle.invalid');
    const basename = url.pathname.split('/').filter(Boolean).at(-1);
    if (
      !basename ||
      !url.pathname.includes('/assets/') ||
      !SAFE_BUNDLE_PREFIXES.has(GENERATED_BUNDLE_NAME.exec(basename)?.[1] ?? '')
    ) {
      return undefined;
    }
    // The suffix is derived from Error.stack and is therefore untrusted even
    // when it resembles a build hash. Keep only a fixed, code-owned label.
    return `/assets/${GENERATED_BUNDLE_NAME.exec(basename)?.[1]}.js`;
  } catch {
    return undefined;
  }
}

export function getPrivacySafeStackFrames(
  stack: string | undefined,
): PrivacySafeStackFrame[] {
  if (!stack) {
    return [];
  }

  const frames: PrivacySafeStackFrame[] = [];
  for (const line of stack.split('\n').slice(1)) {
    const match = line.match(STACK_LOCATION);
    if (!match) {
      continue;
    }
    const filename = sanitizeFrameFilename(match[1] ?? '');
    const lineNumber = Number(match[2]);
    const columnNumber = Number(match[3]);
    if (
      !filename ||
      !Number.isSafeInteger(lineNumber) ||
      !Number.isSafeInteger(columnNumber)
    ) {
      continue;
    }
    frames.push({ filename, lineNumber, columnNumber });
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
    schemaVersion: 1,
    id: context.id,
    capturedAt: context.capturedAt,
    errorType: getSafeErrorType(errorName),
    route: getPrivacySafeRoute(context.route),
    release: context.release,
    environment: context.environment,
    frames: getPrivacySafeStackFrames(errorStack),
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
    report.schemaVersion === 1 &&
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
        typeof frame?.filename === 'string' &&
        isCanonicalFrameFilename(frame.filename) &&
        Number.isSafeInteger(frame.lineNumber) &&
        frame.lineNumber > 0 &&
        Number.isSafeInteger(frame.columnNumber) &&
        frame.columnNumber > 0,
    )
  );
}

function isCanonicalFrameFilename(value: string): boolean {
  const match = /^\/assets\/([a-zA-Z0-9_-]+)\.js$/.exec(value);
  return SAFE_BUNDLE_PREFIXES.has(match?.[1] ?? '');
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
