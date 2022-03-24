import { EXECUTE_SEARCH_OPERATION } from '@bangle.io/constants';

import { CoreOperationsType } from './core-operations';

export type ExposedOperationsType =
  | CoreOperationsType
  | {
      name: typeof EXECUTE_SEARCH_OPERATION;
      value: string;
    };
