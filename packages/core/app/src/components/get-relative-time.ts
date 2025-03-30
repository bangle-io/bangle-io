import { differenceInYears, formatDistanceToNow } from 'date-fns';

export function getRelativeTimeOrNull(timestamp: number): string | null {
  if (differenceInYears(new Date(), new Date(timestamp)) >= 1) {
    return null;
  }
  return formatDistanceToNow(timestamp, { addSuffix: true });
}
