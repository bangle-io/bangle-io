import { DebugFlags } from '@bangle.io/shared-types';

export function getDebugFlag(): Partial<DebugFlags> | undefined {
  // Construct URLSearchParams object from the current window location
  const queryParams = new URLSearchParams(window.location.search);

  // Get the debug_flags parameter from the URL
  const debugFlagsJson = queryParams.get('debug_flags');

  try {
    // Parse the JSON string if it exists
    if (debugFlagsJson) {
      return JSON.parse(debugFlagsJson);
    }
  } catch (error) {
    console.error('Error parsing the debug_flags JSON string: ', error);
  }

  // Return undefined or a default value if the parameter is not found or cannot be parsed
  return undefined;
}

/*
Use following code to set debug_flags in url

searchParams = new URLSearchParams(window.location.search);
searchParams.set('debug_flags', JSON.stringify({ testShowAppRootError: true }));
console.log(searchParams.toString())

*/
