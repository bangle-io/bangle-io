import type { Logger } from '@bangle.io/logger';
import { getAppErrorCause } from './throw-app-error';

export function getGithubUrl(error: Error, logger: Logger): string {
  const MAX_URL_LENGTH = 2000;
  const bodySections: string[] = [];

  // Add initial details
  bodySections.push(formatInitialDetails(error));

  try {
    const appErrorCause = getAppErrorCause(error);
    if (appErrorCause) {
      bodySections.push(formatAppError(appErrorCause));
    } else {
      bodySections.push(...formatErrorCauses(error));
    }
  } catch (e) {
    logger.error('Error in getGithubUrl', e);
    if (e instanceof Error) {
      bodySections.push(formatErrorSection('Error in getGithubUrl', e));
    }
  }

  const joinedBody = bodySections.join('\n\n');
  let encodedBody = encodeURIComponent(joinedBody);

  if (encodedBody.length > MAX_URL_LENGTH) {
    logger.error(
      `Error report body is too long (${encodedBody.length} characters)`,
    );
    const excess = encodedBody.length - MAX_URL_LENGTH;
    const maxBodyLength = joinedBody.length - excess - 3;
    const truncatedBody = `${joinedBody.substring(0, maxBodyLength)}...`;
    encodedBody = encodeURIComponent(truncatedBody);
  }

  return `https://github.com/bangle-io/bangle-io/issues/new?title=Error%20Report&body=${encodedBody}`;
}

function getImportantStackLines(stack: string | undefined, lines = 4): string {
  if (!stack) return '';
  const stackLines = stack.split('\n');
  return stackLines.slice(0, lines).join('\n');
}

function formatInitialDetails(error: Error): string {
  return `
## Details
<!-- Please provide details -->
## Reproduction
**User Agent**
${navigator.userAgent}

**Error**
  \`\`\`
  ${error.message}
  ${getImportantStackLines(error.stack, 5)}
  \`\`\`
    `.trim();
}

function formatAppError(appErrorCause: { name: string; payload: any }): string {
  return `
**App Error**
\`\`\`
${appErrorCause.name}
${JSON.stringify(appErrorCause.payload)}
\`\`\`
    `.trim();
}

function formatErrorSection(title: string, error: Error): string {
  return `
**${title}**
\`\`\`
${error.message}
${getImportantStackLines(error.stack, 3)}
\`\`\`
    `.trim();
}

function formatErrorCauses(error: Error): string[] {
  const sections: string[] = [];
  let currentError = error.cause;
  let level = 1;

  while (currentError instanceof Error && level <= 2) {
    const title = `Cause ${level}`;
    sections.push(formatErrorSection(title, currentError));
    currentError = currentError.cause;
    level++;
  }

  return sections;
}
