// See https://seek-oss.github.io/braid-design-system/foundations/tones
export const TONE = {
  CAUTION: 'caution',
  CRITICAL: 'critical',
  NEUTRAL: 'neutral',
  SECONDARY: 'secondary',
  POSITIVE: 'positive',
  PROMOTE: 'promote',
} as const;
export type Tone = typeof TONE[keyof typeof TONE];

export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

export type Severity = typeof SEVERITY[keyof typeof SEVERITY];
