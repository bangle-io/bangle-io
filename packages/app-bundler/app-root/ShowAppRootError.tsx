import React from 'react';

export function ShowAppRootError({ error }: { error: Error }) {
  const githubIssueUrl = `https://github.com/bangle-io/bangle-io/issues/new?title=Error%20Report&body=${encodeURIComponent(`
## Details

<!-- Please provide as much detail as possible. -->

## Reproduction

**User Agent**
${navigator.userAgent}

**Error**
\`\`\`
${error.message}
${error.stack}
\`\`\`
  `)}`;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="p-6 max-w-lg bg-white rounded-lg border border-gray-200 shadow-md">
        <h2 className="text-2xl font-bold text-gray-900">
          Bangle.io was unable to start due to an unexpected error
        </h2>
        <pre className="mt-4 text-colorCriticalSolidText bg-colorCriticalSolid overflow-auto">
          {error.name}
        </pre>
        <pre className="mt-1 text-colorCriticalSolidText bg-colorCriticalSolid overflow-auto">
          {error.message}
        </pre>
        <a
          href={githubIssueUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-block px-6 py-3 text-sm font-bold leading-6 text-center text-white uppercase transition bg-colorPromoteSolid rounded shadow ripple waves-effect hover:shadow-lg focus:outline-none"
        >
          Report this Error
        </a>
      </div>
    </div>
  );
}
