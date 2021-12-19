import type { PAGE_BLOCK_RELOAD_ACTION_NAME } from '@bangle.io/constants';

export type PAGE_BLOCK_RELOAD_ACTION_TYPE = {
  name: typeof PAGE_BLOCK_RELOAD_ACTION_NAME;
  value: boolean;
};
