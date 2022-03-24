import { useContext } from 'react';

import type { SerialOperationType } from '@bangle.io/shared-types';

import {
  SerialOperationContext,
  SerialOperationContextType,
} from './SerialOperationContextProvider';

export function useSerialOperationContext<
  R extends SerialOperationType = never,
>(): SerialOperationContextType<R> {
  return useContext(SerialOperationContext);
}
