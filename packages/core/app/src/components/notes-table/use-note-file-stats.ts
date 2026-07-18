import { useCoreServices } from '@bangle.io/context';
import type { FileStat } from '@bangle.io/types';
import { useAtomValue } from 'jotai';
import React from 'react';

const STAT_CONCURRENCY = 8;
const STAT_FLUSH_EVERY = 24;

const EMPTY_STATS: ReadonlyMap<string, FileStat> = new Map();

/**
 * Loads file timestamps for the given note paths without blocking the first
 * render: rows appear immediately and timestamp cells fill in as stats
 * resolve. The full scan runs when the note list changes or a force-update
 * relist happens (e.g. Native FS recovery); a regular content update
 * re-stats just the updated path. A path whose stat read fails is simply
 * absent from the returned map; it must never block the rest of the table.
 *
 * Both effects write per-path into one shared map and publish via a version
 * bump, so a targeted refresh can never be overwritten by a slower full
 * scan's stale snapshot.
 */
export function useNoteFileStats(
  wsPaths: readonly string[],
): ReadonlyMap<string, FileStat> {
  const coreServices = useCoreServices();
  const contentUpdateEvent = useAtomValue(
    coreServices.fileSystem.$fileContentUpdateEvent,
  );
  const forceUpdateCount = useAtomValue(
    coreServices.fileSystem.$fileForceUpdateCount,
  );
  const statsMapRef = React.useRef(new Map<string, FileStat>());
  const [publishedStats, setPublishedStats] =
    React.useState<ReadonlyMap<string, FileStat>>(EMPTY_STATS);
  const handledUpdateSequenceRef = React.useRef(0);

  // Bundle the scan triggers: a changed note list or a force-update relist
  // (which keeps the same paths but may have new content on disk).
  const scanRequest = React.useMemo(
    () => ({ wsPaths, forceUpdateCount }),
    [wsPaths, forceUpdateCount],
  );

  // Full stat scan.
  React.useEffect(() => {
    const { wsPaths } = scanRequest;
    const statsMap = statsMapRef.current;

    // Drop entries for notes that no longer exist; keep the rest so a
    // refresh never flashes the table back to empty timestamps.
    const livePaths = new Set(wsPaths);
    for (const knownPath of statsMap.keys()) {
      if (!livePaths.has(knownPath)) {
        statsMap.delete(knownPath);
      }
    }

    if (wsPaths.length === 0) {
      setPublishedStats(EMPTY_STATS);
      return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;
    const queue = [...wsPaths];
    let completedSinceFlush = 0;

    const flush = () => {
      if (!signal.aborted) {
        setPublishedStats(new Map(statsMap));
      }
    };

    const worker = async () => {
      while (!signal.aborted) {
        const wsPath = queue.shift();
        if (wsPath === undefined) {
          return;
        }
        try {
          const stat = await coreServices.fileSystem.fileStat(wsPath, {
            signal,
          });
          if (!signal.aborted) {
            statsMap.set(wsPath, stat);
          }
        } catch {
          // Unreadable/missing file: leave its timestamps blank. The listing
          // itself is the source of truth for which rows exist.
          if (!signal.aborted) {
            statsMap.delete(wsPath);
          }
        }
        completedSinceFlush += 1;
        if (completedSinceFlush >= STAT_FLUSH_EVERY) {
          completedSinceFlush = 0;
          flush();
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(STAT_CONCURRENCY, queue.length) },
      () => worker(),
    );
    void Promise.all(workers).then(flush);

    return () => {
      abortController.abort();
    };
  }, [coreServices.fileSystem, scanRequest]);

  // A content update (including one delivered from another tab) refreshes
  // only the updated path instead of restarting the whole scan.
  React.useEffect(() => {
    if (
      !contentUpdateEvent ||
      contentUpdateEvent.sequence <= handledUpdateSequenceRef.current
    ) {
      return;
    }
    handledUpdateSequenceRef.current = contentUpdateEvent.sequence;

    const { wsPath } = contentUpdateEvent;
    if (!wsPaths.includes(wsPath)) {
      return;
    }

    const abortController = new AbortController();
    void coreServices.fileSystem
      .fileStat(wsPath, { signal: abortController.signal })
      .then(
        (stat) => {
          if (!abortController.signal.aborted) {
            statsMapRef.current.set(wsPath, stat);
            setPublishedStats(new Map(statsMapRef.current));
          }
        },
        () => {
          // Keep the last known stat; the row itself stays intact either way.
        },
      );

    return () => {
      abortController.abort();
    };
  }, [coreServices.fileSystem, contentUpdateEvent, wsPaths]);

  return publishedStats;
}
