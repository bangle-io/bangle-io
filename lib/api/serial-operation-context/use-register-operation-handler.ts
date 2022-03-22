import { useCallback, useEffect } from 'react';

import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { SerialOperationHandler } from '@bangle.io/shared-types';

/**
 * A react hook for handling serial operation dispatched
 */
export function useSerialOperationHandler<T>(
  cb: SerialOperationHandler,
  deps: T[],
) {
  const extensionRegistry = useExtensionRegistryContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoCb = useCallback(cb, deps);

  useEffect(() => {
    const removeCb = extensionRegistry.registerSerialOperationHandler(memoCb);

    return () => {
      removeCb();
    };
  }, [memoCb, extensionRegistry]);
}
