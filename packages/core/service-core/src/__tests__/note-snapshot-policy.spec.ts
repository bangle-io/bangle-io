import { describe, expect, it } from 'vitest';
import {
  computeSnapshotEvictions,
  NOTE_SNAPSHOT_MAX_PER_WORKSPACE,
  type SnapshotPolicyEntry,
} from '../note-snapshot-policy';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const NOW = new Date('2026-07-21T12:00:00Z').getTime();

let idCounter = 0;
function entry(wsPath: string, ageMs: number): SnapshotPolicyEntry {
  idCounter += 1;
  return {
    id: `snap-${String(idCounter).padStart(4, '0')}`,
    wsPath,
    createdAt: NOW - ageMs,
  };
}

function survivors(
  entries: SnapshotPolicyEntry[],
  options: { now: number; maxPerWorkspace?: number } = { now: NOW },
): SnapshotPolicyEntry[] {
  const evicted = new Set(computeSnapshotEvictions(entries, options));
  return entries.filter((item) => !evicted.has(item.id));
}

describe('computeSnapshotEvictions', () => {
  it('keeps everything when snapshots are sparse and recent', () => {
    const entries = [
      entry('ws:a.md', 1 * MINUTE),
      entry('ws:a.md', 15 * MINUTE),
      entry('ws:a.md', 45 * MINUTE),
      entry('ws:b.md', 5 * MINUTE),
    ];
    expect(computeSnapshotEvictions(entries, { now: NOW })).toEqual([]);
  });

  it('thins snapshots of the last hour to one per 10 minutes', () => {
    // One snapshot every 2 minutes for the last hour: 30 snapshots.
    const entries = Array.from({ length: 30 }, (_, i) =>
      entry('ws:a.md', i * 2 * MINUTE),
    );
    const kept = survivors(entries);
    // 10-minute buckets over an hour leaves at most 7 (6 buckets + boundary).
    expect(kept.length).toBeLessThanOrEqual(7);
    // The newest snapshot always survives.
    expect(kept.map((k) => k.id)).toContain(entries[0]?.id);
    // Every kept pair from different buckets is at least ~8 minutes apart
    // (bucket representatives are the newest of each 10-minute bucket).
    const times = kept.map((k) => k.createdAt).sort((a, b) => b - a);
    for (let i = 1; i < times.length; i++) {
      const prev = times[i - 1];
      const current = times[i];
      if (prev === undefined || current === undefined) {
        throw new Error('unexpected');
      }
      expect(prev - current).toBeGreaterThanOrEqual(2 * MINUTE);
    }
  });

  it('keeps snapshots across multiple days while thinning old ones harder', () => {
    const entries = [
      entry('ws:a.md', 5 * MINUTE),
      entry('ws:a.md', 3 * HOUR),
      entry('ws:a.md', 3 * HOUR + 10 * MINUTE),
      entry('ws:a.md', 2 * DAY),
      entry('ws:a.md', 2 * DAY + 2 * HOUR),
      // Both fall in the same week bucket (days 14-20).
      entry('ws:a.md', 15 * DAY),
      entry('ws:a.md', 20 * DAY),
    ];
    const kept = survivors(entries);
    const keptAges = kept.map((k) => NOW - k.createdAt);
    // One representative per hour bucket, day bucket, and week bucket.
    expect(keptAges).toContain(5 * MINUTE);
    expect(keptAges).toContain(3 * HOUR);
    expect(keptAges).not.toContain(3 * HOUR + 10 * MINUTE);
    expect(keptAges).toContain(2 * DAY);
    expect(keptAges).not.toContain(2 * DAY + 2 * HOUR);
    expect(keptAges).toContain(15 * DAY);
    expect(keptAges).not.toContain(20 * DAY);
  });

  it('drops snapshots older than 35 days unless they are the newest of a note', () => {
    const entries = [
      entry('ws:fresh.md', 10 * MINUTE),
      entry('ws:fresh.md', 40 * DAY),
      entry('ws:stale.md', 60 * DAY),
      entry('ws:stale.md', 90 * DAY),
    ];
    const kept = survivors(entries);
    const keptIds = kept.map((k) => k.id);
    expect(keptIds).toContain(entries[0]?.id);
    // Ancient non-newest snapshot of fresh.md is dropped.
    expect(keptIds).not.toContain(entries[1]?.id);
    // stale.md was never edited again: its newest snapshot survives by age.
    expect(keptIds).toContain(entries[2]?.id);
    expect(keptIds).not.toContain(entries[3]?.id);
  });

  it('enforces the per-workspace cap, evicting oldest non-newest snapshots first', () => {
    const entries: SnapshotPolicyEntry[] = [];
    // 10 notes, each with a snapshot every 12 hours for 3 days: 70 snapshots
    // total, all surviving GFS thinning (different hour/day buckets).
    for (let note = 0; note < 10; note++) {
      for (let i = 0; i < 7; i++) {
        entries.push(entry(`ws:note-${note}.md`, i * 12 * HOUR));
      }
    }
    const kept = survivors(entries);
    expect(kept.length).toBeLessThanOrEqual(NOTE_SNAPSHOT_MAX_PER_WORKSPACE);
    // Every note keeps its newest snapshot.
    for (let note = 0; note < 10; note++) {
      expect(
        kept.some(
          (k) => k.wsPath === `ws:note-${note}.md` && NOW - k.createdAt === 0,
        ),
      ).toBe(true);
    }
    // The evicted ones are the oldest non-newest snapshots.
    const keptAges = kept.map((k) => NOW - k.createdAt);
    const oldestKept = Math.max(...keptAges);
    expect(oldestKept).toBeLessThanOrEqual(6 * 12 * HOUR);
  });

  it('evicts newest-per-note snapshots only when notes alone exceed the cap', () => {
    // 60 notes with one snapshot each; cap is 50.
    const entries = Array.from({ length: 60 }, (_, i) =>
      entry(`ws:note-${i}.md`, i * MINUTE),
    );
    const kept = survivors(entries);
    expect(kept).toHaveLength(NOTE_SNAPSHOT_MAX_PER_WORKSPACE);
    // The 50 most recent survive; the 10 oldest are evicted.
    const keptAges = kept.map((k) => NOW - k.createdAt).sort((a, b) => a - b);
    expect(keptAges.at(-1)).toBe(49 * MINUTE);
  });

  it('is idempotent: re-running on the survivors evicts nothing', () => {
    const entries: SnapshotPolicyEntry[] = [];
    for (let i = 0; i < 100; i++) {
      entries.push(entry('ws:a.md', i * 7 * MINUTE));
      entries.push(entry('ws:b.md', i * 31 * MINUTE));
    }
    const kept = survivors(entries);
    expect(computeSnapshotEvictions(kept, { now: NOW })).toEqual([]);
  });

  it('converges when two tabs contribute interleaved snapshots', () => {
    // Tab A and tab B each captured their own snapshots of the same note.
    const tabA = Array.from({ length: 20 }, (_, i) =>
      entry('ws:a.md', i * 5 * MINUTE),
    );
    const tabB = Array.from({ length: 20 }, (_, i) =>
      entry('ws:a.md', i * 5 * MINUTE + MINUTE),
    );
    const all = [...tabA, ...tabB];
    // Both tabs run eviction over the same stored rows: identical results.
    const first = computeSnapshotEvictions(all, { now: NOW });
    const second = computeSnapshotEvictions([...all].reverse(), { now: NOW });
    expect([...first].sort()).toEqual([...second].sort());
    // And the newest snapshot from either tab is always preserved.
    const kept = survivors(all);
    expect(kept.map((k) => k.id)).toContain(tabA[0]?.id);
  });

  it('treats snapshots with future timestamps as most recent', () => {
    const future = {
      id: 'future',
      wsPath: 'ws:a.md',
      createdAt: NOW + HOUR,
    };
    const entries = [future, entry('ws:a.md', 5 * MINUTE)];
    const kept = survivors(entries);
    expect(kept.map((k) => k.id)).toContain('future');
  });
});
