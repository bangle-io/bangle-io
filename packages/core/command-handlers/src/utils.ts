import { throwAppError } from '@bangle.io/base-utils';

export function validateInputPath(inputPath: unknown): void {
  if (typeof inputPath !== 'string') {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidNotePath,
      {
        invalidWsPath: `${inputPath}`,
      },
    );
  }
  if (
    inputPath.endsWith('/') ||
    inputPath.endsWith('/.md') ||
    inputPath.trim() === ''
  ) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidNotePath,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  if (inputPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(inputPath)) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.absolutePathNotAllowed,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  if (inputPath.includes('../') || inputPath.includes('..\\')) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.directoryTraversalNotAllowed,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  // biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
  const invalidChars = /[<>:"\\|?*\x00-\x1F]/g;
  if (invalidChars.test(inputPath)) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidCharsInPath,
      {
        invalidWsPath: inputPath,
      },
    );
  }
  const maxPathLength = 255;
  if (inputPath.length > maxPathLength) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.pathTooLong,
      {
        invalidWsPath: inputPath,
      },
    );
  }
}

/**
 * Writes text to the clipboard, falling back to a hidden textarea and
 * `execCommand('copy')` when the async Clipboard API is unavailable.
 */
export async function writeTextToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.append(textArea);
  textArea.select();
  try {
    if (!document.execCommand('copy')) {
      throw new Error('Clipboard copy command failed');
    }
  } finally {
    textArea.remove();
  }
}
