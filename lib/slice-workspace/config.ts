import { isMobile } from '@bangle.io/utils';

export const MAX_ENTRIES = isMobile ? 12 : 64;
export const MAX_TIMESTAMPS_PER_ENTRY = 5;
export const WORKSPACE_INFO_CACHE_REFRESH_INTERVAL = 500;
