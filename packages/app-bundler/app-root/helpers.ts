import { DebugFlags } from '@bangle.io/shared-types';

export function getDebugFlag(): DebugFlags {
  const queryParams = new URLSearchParams(window.location.search);

  const debugFlagsJson = queryParams.get('debug_flags');

  try {
    // Parse the JSON string if it exists
    if (debugFlagsJson) {
      return JSON.parse(debugFlagsJson);
    }
  } catch (error) {
    console.error('Error parsing the debug_flags JSON string: ', error);
  }

  return {};
}

/*
Use following code to set debug_flags in url

searchParams = new URLSearchParams(window.location.search);
searchParams.set('debug_flags', JSON.stringify({ testShowAppRootSetupError: true , testDelayWorkerInitialize: 5000}));
console.log(searchParams.toString())

*/
