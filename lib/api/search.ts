import { EXECUTE_SEARCH_OPERATION } from '@bangle.io/constants';
import type { AppState } from '@bangle.io/create-store';
import type { DispatchSerialOperationType } from '@bangle.io/shared-types';

export function searchByTag(
  dispatchSerialOperation: DispatchSerialOperationType,
  tagValue: string,
) {
  return (_: AppState): void => {
    dispatchSerialOperation({
      name: EXECUTE_SEARCH_OPERATION,
      value: `tag:${tagValue}`,
    });
  };
}
