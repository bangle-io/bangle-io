import { z } from '@bangle.io/nsm';
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

export const COLOR_SCHEMA = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const colorSchema = z.nativeEnum(COLOR_SCHEMA);

export type ColorScheme = z.infer<typeof colorSchema>;

export const NotificationPayloadSchema = z.object({
  uid: z.string(),
  title: z.string(),
  content: z.string().optional(),
  severity: z.nativeEnum(SEVERITY).optional(),
  // if notification needs to clear automatically
  transient: z.boolean().optional(),
  // DO NOT use this field as it is internal
  createdAt: z.number().optional(),
  buttons: z
    .array(
      z.object({
        title: z.string(),
        hint: z.string().optional(),
        operation: z.string(),
        // whether to dismiss the notification on clicking of the button
        dismissOnClick: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type NotificationPayloadType = z.infer<typeof NotificationPayloadSchema>;
