import type { ColorScheme } from '@bangle.io/shared-types';
export const WIDESCREEN_WIDTH = 759;

// See https://seek-oss.github.io/braid-design-system/foundations/tones
export const TONE = {
  CAUTION: 'caution',
  CRITICAL: 'critical',
  NEUTRAL: 'neutral',
  SECONDARY: 'secondary',
  POSITIVE: 'positive',
  PROMOTE: 'promote',
} as const;
export type Tone = (typeof TONE)[keyof typeof TONE];

export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export type NotificationPayloadType = {
  uid: string;
  title: string;
  content?: string;
  severity?: Severity;
  transient?: boolean;
  createdAt?: number;
  buttons?: {
    title: string;
    hint?: string;
    operation: string;
    dismissOnClick?: boolean;
  }[];
};

const LIGHT_SCHEME = 'light' satisfies ColorScheme;
const DARK_SCHEME = 'dark' satisfies ColorScheme;
export const COLOR_SCHEME = {
  LIGHT: LIGHT_SCHEME,
  DARK: DARK_SCHEME,
} as const;
