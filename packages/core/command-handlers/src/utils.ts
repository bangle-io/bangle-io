import { throwAppError } from '@bangle.io/base-utils';
import { WsPath } from '@bangle.io/ws-path';

const MAX_PATH_LENGTH = 255;

export function validateInputPath(inputPath: unknown): void {
  if (typeof inputPath !== 'string') {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidNotePath,
      { invalidWsPath: `${inputPath}` },
    );
  }

  // Note-path specific rules: these have no equivalent in the generic
  // `ws-path` path validation and are not duplicated logic.
  if (
    inputPath.endsWith('/') ||
    inputPath.endsWith('/.md') ||
    inputPath.trim() === ''
  ) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.invalidNotePath,
      { invalidWsPath: inputPath },
    );
  }

  const result = WsPath.validation.validatePath(inputPath);
  if (!result.ok) {
    // The reason is ws-path's own (untranslated) validation message —
    // simpler and less brittle than mapping its wording onto a translated
    // message category here.
    throwAppError(
      'error::ws-path:create-new-note',
      result.validationError.reason,
      {
        invalidWsPath: inputPath,
      },
    );
  }

  if (inputPath.length > MAX_PATH_LENGTH) {
    throwAppError(
      'error::ws-path:create-new-note',
      t.app.errors.wsPath.pathTooLong,
      { invalidWsPath: inputPath },
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

/**
 * Reads text from the clipboard. Throws when the async Clipboard read API is
 * unavailable (there is no reliable synchronous fallback for reads).
 */
export async function readTextFromClipboard(): Promise<string> {
  if (!navigator.clipboard?.readText) {
    throw new Error('Clipboard read is not supported');
  }
  return navigator.clipboard.readText();
}
