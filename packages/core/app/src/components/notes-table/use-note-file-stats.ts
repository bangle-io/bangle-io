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
 * resolve. Stats refresh whenever the note list or any file content changes.
 * A path whose stat read fails is simply absent from the returned map; it
 * must never block the rest of the table.
 */
export function useNoteFileStats(
  wsPaths: readonly string[],
): ReadonlyMap<string, FileStat> {
  const coreServices = useCoreServices();
  const contentUpdateCount = useAtomValue(
    coreServices.fileSystem.$fileContentUpdateCount,
  );
  const [stats, setStats] =
    React.useState<ReadonlyMap<string, FileStat>>(EMPTY_STATS);
  const latestStatsRef = React.useRef(stats);
  latestStatsRef.current = stats;

  // Bundle the paths with the content-update counter so a content change
  // re-runs the effect even though the path list itself is unchanged.
  const statRequest = React.useMemo(
    () => ({ wsPaths, contentUpdateCount }),
    [wsPaths, contentUpdateCount],
  );

  React.useEffect(() => {
    const { wsPaths } = statRequest;
    if (wsPaths.length === 0) {
      setStats(EMPTY_STATS);
      return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;
    // Seed with still-relevant previous entries so a refresh never flashes
    // the table back to empty timestamps.
    const results = new Map<string, FileStat>();
    for (const wsPath of wsPaths) {
      const previous = latestStatsRef.current.get(wsPath);
      if (previous) {
        results.set(wsPath, previous);
      }
    }

    const queue = [...wsPaths];
    let completedSinceFlush = 0;

    const flush = () => {
      if (!signal.aborted) {
        setStats(new Map(results));
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
          results.set(wsPath, stat);
        } catch {
          // Unreadable/missing file: leave its timestamps blank. The listing
          // itself is the source of truth for which rows exist.
          results.delete(wsPath);
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
  }, [coreServices.fileSystem, statRequest]);

  return stats;
}
