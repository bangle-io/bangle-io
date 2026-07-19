import type { AppRouteInfo } from './base-router';

export type PrivacySafeErrorType =
  | 'AggregateError'
  | 'DOMException'
  | 'Error'
  | 'EvalError'
  | 'RangeError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'TypeError'
  | 'URIError';

export type PrivacySafeStackFrame = {
  filename: string;
  lineNumber: number;
  columnNumber: number;
};

/**
 * The complete payload Bangle is allowed to persist or send for a bug report.
 *
 * This type intentionally has no free-form message, URL, breadcrumb, user,
 * cause, or context fields. User-controlled note and workspace data must never
 * cross this boundary.
 */
export type PrivacySafeErrorReport = {
  schemaVersion: 1;
  id: string;
  capturedAt: string;
  errorType: PrivacySafeErrorType;
  route: AppRouteInfo['route'] | 'unknown';
  release: string;
  environment: string;
  frames: PrivacySafeStackFrame[];
};

export type ManualErrorReportHandler = (
  report: PrivacySafeErrorReport,
) => Promise<void>;

export type ErrorReportingController = {
  captureException: (error: Error) => void;
  setAutomaticReportingEnabled: (enabled: boolean) => Promise<void>;
  setManualReportHandler: (
    handler: ManualErrorReportHandler | undefined,
  ) => void;
  sendReports: (
    reports: readonly PrivacySafeErrorReport[],
  ) => Promise<{ sentReportIds: readonly string[] }>;
};
