// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsageTracker } from '../usage-tracker';

type Send = ConstructorParameters<typeof UsageTracker>[0]['send'];
const trackers: UsageTracker[] = [];
function setup(send = vi.fn<Send>(async () => true)) {
  const tracker = new UsageTracker({ storage: localStorage, send });
  trackers.push(tracker);
  tracker.setEnabled(true);
  return { tracker, send };
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
});
afterEach(() => {
  for (const tracker of trackers.splice(0)) tracker.destroy();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('daily usage summaries', () => {
  it('does not count app startup; deduplicates activity across reloads and UTC days', async () => {
    const { tracker, send } = setup();
    await vi.advanceTimersByTimeAsync(0);
    expect(send).not.toHaveBeenCalled();
    await tracker.record('read');
    await tracker.record('read');
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    const first = send.mock.calls[0];
    expect(first).toBeDefined();
    tracker.destroy();
    const reloaded = setup(send).tracker;
    await reloaded.record('read');
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
    await reloaded.record('edited');
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map((call) => call[0])).toEqual([
      {
        version: 1,
        installationId: expect.any(String),
        day: '2026-09-19',
        read: true,
        edited: false,
      },
      {
        version: 1,
        installationId: expect.any(String),
        day: '2026-09-20',
        read: false,
        edited: true,
      },
    ]);
    expect(send.mock.calls[0]?.[0]).toHaveProperty(
      'installationId',
      send.mock.calls[1]?.[0]?.installationId,
    );
  });

  it('merges reading and editing from two tabs under the same installation', async () => {
    const first = setup();
    const second = setup();
    await Promise.all([
      first.tracker.record('read'),
      second.tracker.record('edited'),
    ]);
    await vi.advanceTimersByTimeAsync(0);
    const payloads = [...first.send.mock.calls, ...second.send.mock.calls].map(
      (call) => call[0],
    );
    expect(
      new Set(payloads.map((payload) => payload?.installationId)).size,
    ).toBe(1);
    expect(payloads).toContainEqual(
      expect.objectContaining({ read: true, edited: true }),
    );
  });

  it('retries outages with backoff, without sending every edit, and survives reload', async () => {
    const send = vi.fn<Send>(async () => false);
    const { tracker } = setup(send);
    await tracker.record('edited');
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    await tracker.record('edited');
    await vi.advanceTimersByTimeAsync(29_999);
    expect(send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(2);
    tracker.destroy();
    send.mockResolvedValue(true);
    setup(send);
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[2]?.[0]).toEqual(send.mock.calls[0]?.[0]);
  });

  it('drops queued activity on opt-out and never backfills activity while disabled', async () => {
    const { tracker, send } = setup(vi.fn<Send>(async () => false));
    await tracker.record('read');
    await vi.advanceTimersByTimeAsync(0);
    tracker.setEnabled(false);
    await vi.advanceTimersByTimeAsync(0);
    await tracker.record('edited');
    await vi.advanceTimersByTimeAsync(300_000);
    expect(send).toHaveBeenCalledTimes(1);
    send.mockResolvedValue(true);
    tracker.setEnabled(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    await tracker.record('edited');
    await vi.advanceTimersByTimeAsync(0);
    expect(send.mock.calls[1]?.[0]).toMatchObject({
      read: false,
      edited: true,
    });
  });

  it('expires offline summaries after seven days and tolerates full storage', async () => {
    const { tracker, send } = setup(vi.fn<Send>(async () => false));
    await tracker.record('read');
    await vi.advanceTimersByTimeAsync(0);
    tracker.destroy();
    vi.setSystemTime(new Date('2026-09-26T12:00:00Z'));
    const reloaded = setup(send).tracker;
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
    reloaded.destroy();
    const fullStorage = new UsageTracker({
      storage: {
        getItem: (key) => localStorage.getItem(key),
        setItem: () => {
          throw new Error('Quota exceeded');
        },
      },
      send,
    });
    trackers.push(fullStorage);
    fullStorage.setEnabled(true);
    await expect(fullStorage.record('edited')).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
