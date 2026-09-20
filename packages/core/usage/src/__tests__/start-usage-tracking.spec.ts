// @vitest-environment happy-dom
import { atom, createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startUsageTracking } from '../index';

const controllers: AbortController[] = [];
const send = vi.fn<typeof fetch>();
let visible = true;

function interact(trusted = true) {
  const event = new Event('pointerdown');
  Object.defineProperty(event, 'isTrusted', { value: trusted });
  document.dispatchEvent(event);
}

function setup() {
  const controller = new AbortController();
  controllers.push(controller);
  const store = createStore();
  const enabled = atom(true);
  const isNoteReady = vi.fn(() => false);
  const saves = new Set<() => void>();
  startUsageTracking({
    store,
    enabled,
    isNoteReady,
    subscribeToSavedEdits: (listener) => {
      saves.add(listener);
      return () => saves.delete(listener);
    },
    signal: controller.signal,
  });
  return {
    controller,
    store,
    enabled,
    isNoteReady,
    saves,
    save: () => {
      for (const listener of saves) listener();
    },
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
  visible = true;
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    visible ? 'visible' : 'hidden',
  );
  send
    .mockReset()
    .mockImplementation(async () => new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', send);
});

afterEach(() => {
  for (const controller of controllers.splice(0)) controller.abort();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('usage module', () => {
  it('counts reading from editor readiness, independent of editor markup', async () => {
    const { isNoteReady } = setup();
    document.body.innerHTML = '<div class="ProseMirror"></div>';
    interact();
    await vi.advanceTimersByTimeAsync(35_000);
    expect(send).not.toHaveBeenCalled();

    document.body.replaceChildren();
    isNoteReady.mockReturnValue(true);
    interact();
    await vi.advanceTimersByTimeAsync(25_000);
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(send).toHaveBeenCalledOnce();
    expect(JSON.parse(String(send.mock.calls[0]?.[1]?.body))).toEqual({
      version: 1,
      installationId: expect.any(String),
      day: '2026-09-19',
      read: true,
      edited: false,
    });
  });

  it('requires a recent trusted interaction and restarts reading after leaving a note', async () => {
    const { isNoteReady } = setup();
    isNoteReady.mockReturnValue(true);
    interact(false);
    await vi.advanceTimersByTimeAsync(35_000);
    expect(send).not.toHaveBeenCalled();
    interact();
    await vi.advanceTimersByTimeAsync(20_000);
    isNoteReady.mockReturnValue(false);
    await vi.advanceTimersByTimeAsync(45_000);
    isNoteReady.mockReturnValue(true);
    await vi.advanceTimersByTimeAsync(35_000);
    expect(send).not.toHaveBeenCalled();
    interact();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(send).toHaveBeenCalledOnce();
  });

  it('does not carry hidden-tab reading time into foreground activity', async () => {
    const { isNoteReady } = setup();
    isNoteReady.mockReturnValue(true);
    interact();
    await vi.advanceTimersByTimeAsync(20_000);
    visible = false;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(30_000);
    visible = true;
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(30_000);
    expect(send).not.toHaveBeenCalled();
    interact();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(send).toHaveBeenCalledOnce();
  });

  it('counts saved edits after interaction and respects preference changes immediately', async () => {
    const { save, store, enabled } = setup();
    save();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).not.toHaveBeenCalled();
    store.set(enabled, false);
    interact();
    save();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).not.toHaveBeenCalled();
    store.set(enabled, true);
    save();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).not.toHaveBeenCalled();
    interact();
    save();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledOnce();
    expect(JSON.parse(String(send.mock.calls[0]?.[1]?.body))).toMatchObject({
      read: false,
      edited: true,
    });
    expect(send.mock.calls[0]?.[1]).toMatchObject({
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  });

  it('aborts delivery and removes subscriptions and timers with the app lifetime', async () => {
    send.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('Aborted')),
          );
        }),
    );
    const { controller, isNoteReady, saves, save, store, enabled } = setup();
    isNoteReady.mockReturnValue(true);
    interact();
    save();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledOnce();
    controller.abort();
    expect(send.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(saves.size).toBe(0);
    store.set(enabled, false);
    store.set(enabled, true);
    interact();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(send).toHaveBeenCalledOnce();
    expect(isNoteReady).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
