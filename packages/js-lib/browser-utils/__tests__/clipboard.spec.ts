// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writeTextToClipboard } from '../src/clipboard';

const originalClipboard = Object.getOwnPropertyDescriptor(
  navigator,
  'clipboard',
);
const originalExecCommand = document.execCommand;

afterEach(() => {
  if (originalClipboard) {
    Object.defineProperty(navigator, 'clipboard', originalClipboard);
  } else {
    Reflect.deleteProperty(navigator, 'clipboard');
  }
  document.execCommand = originalExecCommand;
});

describe('writeTextToClipboard', () => {
  it('starts the Clipboard API write synchronously', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const result = writeTextToClipboard('diagnostics report');

    expect(writeText).toHaveBeenCalledWith('diagnostics report');
    await result;
  });

  it('uses the hidden-textarea fallback when the Clipboard API is absent', async () => {
    Reflect.deleteProperty(navigator, 'clipboard');
    document.execCommand = vi.fn(() => true);

    await expect(
      writeTextToClipboard('fallback report'),
    ).resolves.toBeUndefined();

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });
});
