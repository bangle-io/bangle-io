export function readFileAsText(file: File | Blob): Promise<string> {
  // If the new .text() reader is available, use it.
  if (file.text) {
    return file.text();
  }

  // Otherwise use the traditional file reading technique.
  return _readFileLegacy(file);
}

/**
 * Reads the raw text from a file.
 *
 * @private
 * @param {File} file
 * @return {Promise<string>} A promise that resolves to the parsed string.
 */
function _readFileLegacy(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('loadend', (e) => {
      const result = (e.target as FileReader | null)?.result;
      resolve(typeof result === 'string' ? result : '');
    });
    reader.readAsText(file);
  });
}
