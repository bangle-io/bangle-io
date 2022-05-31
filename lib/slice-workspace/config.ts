import { isMobile } from '@bangle.io/config';

export const MAX_ENTRIES = isMobile ? 12 : 64;
export const MAX_TIMESTAMPS_PER_ENTRY = 5;
