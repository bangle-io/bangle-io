import { DEFAULT_DEBUG_FLAGS } from '@bangle.io/constants';
import { DebugFlags } from '@bangle.io/shared-types';

import { logger } from './logger';

export function getDebugFlag(): DebugFlags {
  // TODO move this to local storage as this can cause security issues
  // in production as it can be used to inject code directly from URL
  const queryParams = new URLSearchParams(window.location.search);

  const debugFlagsJson = queryParams.get('debug_flags');

  try {
    // Parse the JSON string if it exists
    if (debugFlagsJson) {
      return {
        ...DEFAULT_DEBUG_FLAGS,
        ...JSON.parse(debugFlagsJson),
      };
    }
  } catch (error) {
    logger.error('Error parsing the debug_flags JSON string: ', error);
  }

  return {
    ...DEFAULT_DEBUG_FLAGS,
  };
}

/*
Use following code to set debug_flags in url

searchParams = new URLSearchParams(window.location.search);
searchParams.set('debug_flags', JSON.stringify({ testShowAppRootSetupError: true , testDelayWorkerInitialize: 5000}));
console.log(searchParams.toString())

*/
