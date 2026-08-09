/**
 * Writes text to the clipboard, falling back to a hidden textarea and
 * `execCommand('copy')` when the async Clipboard API is unavailable.
 *
 * Call this directly from the user-activation handler. The clipboard request
 * begins synchronously even though its completion is represented by a promise.
 */
export function writeTextToClipboard(value: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      return Promise.resolve(navigator.clipboard.writeText(value));
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
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}
