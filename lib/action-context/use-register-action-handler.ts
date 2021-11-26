import { useCallback, useEffect } from 'react';

import { useExtensionRegistryContext } from '@bangle.io/extension-registry';
import type { ActionHandler } from '@bangle.io/shared-types';

/**
 * A react hook for handling any action dispatched
 */
export function useActionHandler<T>(cb: ActionHandler, deps: Array<T>) {
  const extensionRegistry = useExtensionRegistryContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoCb = useCallback(cb, deps);

  useEffect(() => {
    const removeCb = extensionRegistry.registerActionHandler(memoCb);
    return () => {
      removeCb();
    };
  }, [memoCb, extensionRegistry]);
}
