import os from 'node:os';
import type { Page } from '@playwright/test';

export const isDarwin = os.platform() === 'darwin';
export const ctrlKey = os.platform() === 'darwin' ? 'Meta' : 'Control';
export const EDITOR_SELECTOR = '.ProseMirror';
export const EDITOR_FOCUSED_SELECTOR = `${EDITOR_SELECTOR}.ProseMirror-focused`;
const DEFAULT_SLEEP_TIME = 20;

export function sleep(t = DEFAULT_SLEEP_TIME) {
  return new Promise((res) => setTimeout(res, t));
}

export function getEditorLocator(page: Page, _options: { editorId?: string }) {
  return page.locator(EDITOR_SELECTOR);
}
export async function waitForEditorFocus(
  page: Page,
  _options: { editorId?: string },
) {
  await page.locator(EDITOR_FOCUSED_SELECTOR).waitFor();
}

export async function getEditorText(
  page: Page,
  options: { editorId?: string },
) {
  const locator = getEditorLocator(page, options);
  return locator.innerText();
}

export async function clearEditor(page: Page, options: { editorId?: string }) {
  await waitForEditorFocus(page, options);

  const MAX_RETRY = 3;
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt < MAX_RETRY) {
    try {
      await page.keyboard.press(`${ctrlKey}+a`);
      await page.keyboard.press('Backspace');

      const text = await getEditorText(page, options);
      if (text.trim() === '') {
        return; // Success
      }
      lastError = new Error(`Editor not cleared after attempt ${attempt + 1}`);
    } catch (error) {
      lastError = error as Error;
    }

    attempt++;
    // Add a small delay between retries
    if (attempt < MAX_RETRY) {
      await sleep();
    }
  }

  throw new Error(
    `Failed to clear editor after ${MAX_RETRY} attempts: ${lastError?.message}`,
  );
}
