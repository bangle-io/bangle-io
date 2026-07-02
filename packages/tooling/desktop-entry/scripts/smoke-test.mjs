#!/usr/bin/env node

import * as NodeFS from 'node:fs';
import * as NodeFSP from 'node:fs/promises';
import * as NodeModule from 'node:module';
import * as NodeOS from 'node:os';
import * as NodePath from 'node:path';
import * as NodeURL from 'node:url';
import { _electron as electron } from 'playwright';

const require = NodeModule.createRequire(import.meta.url);
const packageDir = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  '..',
);
const repoRoot = NodePath.resolve(packageDir, '..', '..', '..');
const args = new Set(process.argv.slice(2));

if (args.has('--skip-if-not-darwin') && NodeOS.platform() !== 'darwin') {
  console.log('[desktop-smoke] Skipping Electron smoke test outside macOS.');
  process.exit(0);
}

const mainPath = NodePath.join(packageDir, 'dist', 'main.cjs');
const browserDistDir = NodePath.join(
  repoRoot,
  'packages',
  'tooling',
  'browser-entry',
  'dist',
);

for (const requiredPath of [
  mainPath,
  NodePath.join(packageDir, 'dist', 'preload.cjs'),
  NodePath.join(browserDistDir, 'index.html'),
]) {
  if (!NodeFS.existsSync(requiredPath)) {
    throw new Error(
      `[desktop-smoke] Missing ${requiredPath}. Run pnpm desktop:build first.`,
    );
  }
}

const userDataDir = await NodeFSP.mkdtemp(
  NodePath.join(NodeOS.tmpdir(), 'bangle-desktop-smoke-'),
);
const workspaceName = `desktop-smoke-${Date.now()}`;
const noteName = 'smoke-note';
const noteContent = `Desktop smoke ${Date.now()}`;
const editorSelector = '.ProseMirror';

async function launchApp() {
  return electron.launch({
    executablePath: require('electron'),
    args: [`--user-data-dir=${userDataDir}`, mainPath],
    env: {
      ...process.env,
      BANGLE_DESKTOP_BROWSER_DIST: browserDistDir,
      ELECTRON_ENABLE_LOGGING: '1',
    },
  });
}

async function firstWindow(app) {
  const page = await app.firstWindow();
  page.setDefaultTimeout(30_000);
  await page.waitForLoadState('domcontentloaded').catch(() => undefined);
  return page;
}

async function assertNativeFileSystemAccessApi(page) {
  const support = await page.evaluate(() => ({
    href: window.location.href,
    isSecureContext: window.isSecureContext,
    showDirectoryPicker: typeof window.showDirectoryPicker,
  }));

  if (
    support.isSecureContext !== true ||
    support.showDirectoryPicker !== 'function'
  ) {
    throw new Error(
      `[desktop-smoke] Native FS browser API is unavailable in Electron: ${JSON.stringify(
        support,
      )}.`,
    );
  }
}

async function createBrowserWorkspaceAndNote(page) {
  await page.getByRole('button', { name: 'Create Workspace' }).click();
  await page
    .getByRole('radio', { name: 'Browser Save workspace data' })
    .click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Workspace Name', { exact: true }).fill(workspaceName);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('heading', { name: workspaceName }).waitFor();

  await page.getByRole('button', { name: 'New Note' }).click();
  await page.getByPlaceholder('Input a note name').fill(noteName);
  await page.getByRole('button', { name: 'Create' }).click();
  await page
    .getByLabel('breadcrumb')
    .getByRole('button', { name: `${noteName}.md` })
    .waitFor();
}

function noteUrl() {
  return `bangle://app/ws#route=editor&wsPath=${encodeURIComponent(
    `${workspaceName}:${noteName}.md`,
  )}`;
}

async function openNoteRoute(page) {
  await page.evaluate((url) => {
    window.location.href = url;
  }, noteUrl());
}

let app = await launchApp();
let page = await firstWindow(app);

try {
  console.log('[desktop-smoke] Checking Native FS browser API availability.');
  await assertNativeFileSystemAccessApi(page);

  console.log('[desktop-smoke] Creating Browser workspace and note.');
  await createBrowserWorkspaceAndNote(page);
  await page.locator(editorSelector).click();
  await page.locator(editorSelector).pressSequentially(noteContent, {
    delay: 10,
  });
  console.log('[desktop-smoke] Checking persistence after reload.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openNoteRoute(page);
  await page.locator(editorSelector).waitFor();

  const textAfterReload = await page.locator(editorSelector).innerText();
  if (textAfterReload.trim() !== noteContent) {
    throw new Error(
      `[desktop-smoke] Expected note content after reload to be ${JSON.stringify(
        noteContent,
      )}, got ${JSON.stringify(textAfterReload.trim())}.`,
    );
  }

  console.log('[desktop-smoke] Checking persistence after restart.');
  await app.close();
  app = await launchApp();
  page = await firstWindow(app);
  await openNoteRoute(page);
  await page.locator(editorSelector).waitFor();

  const textAfterRestart = await page.locator(editorSelector).innerText();
  if (textAfterRestart.trim() !== noteContent) {
    throw new Error(
      `[desktop-smoke] Expected note content after restart to be ${JSON.stringify(
        noteContent,
      )}, got ${JSON.stringify(textAfterRestart.trim())}.`,
    );
  }

  console.log('[desktop-smoke] Electron persistence smoke passed.');
} finally {
  await app.close().catch(() => undefined);
  await NodeFSP.rm(userDataDir, { force: true, recursive: true });
}
