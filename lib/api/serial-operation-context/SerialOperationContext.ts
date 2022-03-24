import { useContext } from 'react';

import { SerialOperationContext } from './SerialOperationContextProvider';

export function useSerialOperationContext() {
  return useContext(SerialOperationContext);
}
