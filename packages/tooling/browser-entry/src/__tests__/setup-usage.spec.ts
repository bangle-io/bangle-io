// @vitest-environment happy-dom
import { ThemeManager } from '@bangle.io/color-scheme-manager';
import {
  createEditorSaveCoordinator,
  initializeServices,
} from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import { createStore } from 'jotai';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setupRootEmitter } from '../setup-root-emitter';
import { setupUsage } from '../setup-usage';

const environment = vi.hoisted(() => ({ appEnv: 'local' }));
vi.mock('@bangle.io/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@bangle.io/config')>()),
  get APP_ENV() {
    return environment.appEnv;
  },
}));

let controller: AbortController;
let options: Parameters<typeof setupUsage>[0];
const send = vi.fn<typeof fetch>();

beforeEach(async () => {
  localStorage.clear();
  controller = new AbortController();
  const logger = new Logger('usage-bootstrap');
  const store = createStore();
  const editorSaveCoordinator = createEditorSaveCoordinator();
  const services = await initializeServices(
    logger,
    setupRootEmitter('usage-bootstrap', 'test', logger, controller.signal),
    store,
    new ThemeManager(),
    controller.signal,
    editorSaveCoordinator,
  );
  options = {
    services,
    store,
    editorSaveCoordinator,
    signal: controller.signal,
  };
  localStorage.setItem(
    'bangle:usage:v1',
    JSON.stringify({
      id: '01234567-89ab-4cde-8fab-0123456789ab',
      days: {
        [new Date().toISOString().slice(0, 10)]: {
          read: true,
          edited: false,
          sentRead: false,
          sentEdited: false,
        },
      },
    }),
  );
  send.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', send);
  vi.useFakeTimers();
});

afterEach(() => {
  controller.abort();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it.each([
  ['production', 'https://app.bangle.io/', false, false, true],
  ['production', 'https://app.bangle.io/?usageTest=true', true, false, false],
  ['production', 'http://localhost:5173/?usageTest=true', false, false, false],
  ['staging', 'https://app.bangle.io/', false, false, false],
  ['staging', 'http://localhost:5173/?usageTest=true', true, false, false],
  ['local', 'http://localhost:5173/', false, false, false],
  ['local', 'http://localhost:5173/?usageTest=true', true, false, true],
  ['local', 'http://127.0.0.1:5173/?usageTest=true', true, false, true],
  ['local', 'https://preview.bangle.io/?usageTest=true', false, false, false],
  ['local', 'file:///app/index.html?usageTest=true', false, false, false],
  ['local', 'http://localhost:5173/?usageTest=true', true, true, false],
] as const)(
  'gates %s at %s (webdriver=%s, aborted=%s, sends=%s)',
  async (appEnv, href, webdriver, aborted, allowed) => {
    environment.appEnv = appEnv;
    const url = new URL(href);
    vi.spyOn(window.location, 'origin', 'get').mockReturnValue(url.origin);
    vi.spyOn(window.location, 'hostname', 'get').mockReturnValue(url.hostname);
    vi.spyOn(window.location, 'search', 'get').mockReturnValue(url.search);
    vi.spyOn(navigator, 'webdriver', 'get').mockReturnValue(webdriver);
    if (aborted) controller.abort();

    setupUsage(options);
    await vi.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenCalledTimes(allowed ? 1 : 0);
  },
);
