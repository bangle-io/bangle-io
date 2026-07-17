import { differenceInYears, format, formatDistanceToNow } from 'date-fns';

export function getRelativeTimeOrNull(timestamp: number): string | null {
  if (differenceInYears(new Date(), new Date(timestamp)) >= 1) {
    return null;
  }
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

/**
 * Human-friendly timestamp: relative within the last year, an absolute date
 * beyond that, and null for missing/zero timestamps.
 */
export function getTimestampDisplay(
  timestamp: number | undefined,
): string | null {
  if (timestamp === undefined || timestamp <= 0) {
    return null;
  }
  return getRelativeTimeOrNull(timestamp) ?? format(timestamp, 'd MMM yyyy');
}
