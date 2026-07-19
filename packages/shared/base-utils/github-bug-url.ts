import type { Logger } from '@bangle.io/logger';
import { getPrivacySafeStackFrames } from './privacy-safe-error-report';

export function getGithubUrl(error: Error, logger: Logger): string {
  const MAX_URL_LENGTH = 2000;
  const safeType = getSafeErrorType(error.name);
  const safeFrames = getPrivacySafeStackFrames(error.stack).slice(-5);
  const body = `
## What happened?
<!-- Please describe what you were doing and what went wrong. Avoid including private note content. -->

## Privacy-safe diagnostics

**Error type:** ${safeType}

**App code locations:**
\`\`\`
${
  safeFrames
    .map(
      (frame) => `${frame.filename}:${frame.lineNumber}:${frame.columnNumber}`,
    )
    .join('\n') || 'No app stack frames were available.'
}
\`\`\`

Workspace names, note names, note contents, page URLs, route parameters, error messages, and error causes are intentionally excluded.
  `.trim();

  const encodedBody = encodeURIComponent(body);
  if (encodedBody.length > MAX_URL_LENGTH) {
    logger.warn('Privacy-safe error report exceeded the GitHub URL limit.');
  }

  return `https://github.com/bangle-io/bangle-io/issues/new?title=Error%20Report&body=${encodedBody.slice(0, MAX_URL_LENGTH)}`;
}

function getSafeErrorType(name: string): string {
  switch (name) {
    case 'AggregateError':
    case 'DOMException':
    case 'Error':
    case 'EvalError':
    case 'RangeError':
    case 'ReferenceError':
    case 'SyntaxError':
    case 'TypeError':
    case 'URIError':
      return name;
    default:
      return 'Error';
  }
}
