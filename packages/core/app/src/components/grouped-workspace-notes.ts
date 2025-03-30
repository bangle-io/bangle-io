import { useCoreServices } from '@bangle.io/context';
import { WsPath } from '@bangle.io/ws-path';
import { useAtomValue } from 'jotai';
import React from 'react';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function useGroupedWorkspaceNotes() {
  const coreServices = useCoreServices();
  const allWsPaths = useAtomValue(coreServices.workspaceState.$wsPaths);
  const recentWsPaths = useAtomValue(
    coreServices.userActivityService.$recentWsPaths,
  );
  const allRecentWsPaths = useAtomValue(
    coreServices.userActivityService.$allRecentWsPaths,
  );

  const sortedPathsWithTimestamp = React.useMemo(() => {
    return allWsPaths
      .map((wsPath): { wsPath: string; timestamp: number } => {
        const recentActivity = allRecentWsPaths.find(
          (r) => r.wsPath === wsPath.wsPath,
        );
        if (recentActivity) {
          return { wsPath: wsPath.wsPath, timestamp: recentActivity.timestamp };
        }
        return { wsPath: wsPath.wsPath, timestamp: 0 };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allWsPaths, allRecentWsPaths]);

  return React.useMemo(() => {
    // Get recent paths (top 5) with timestamps
    const recentOrdered = recentWsPaths
      .filter((p) => allWsPaths.some((wsPath) => wsPath.wsPath === p))
      .slice(0, 5)
      .map((wsPath) => ({
        wsPath: wsPath,
        timestamp:
          allRecentWsPaths.find((r) => r.wsPath === wsPath)?.timestamp || 0,
      }));

    const now = Date.now();
    const sevenDaysAgo = now - SEVEN_DAYS_MS;

    // Filter last 7 days excluding recent
    const last7days = sortedPathsWithTimestamp.filter(
      (item) =>
        item.timestamp >= sevenDaysAgo &&
        !recentOrdered.map((r) => r.wsPath).includes(item.wsPath),
    );

    const toLinkObj = (item: { wsPath: string; timestamp: number }) => {
      const wsPath = WsPath.fromString(item.wsPath);
      const filePath = wsPath.asFile();
      const fileName = filePath?.fileName || item.wsPath;
      const href = coreServices.navigation.toUri({
        route: 'editor',
        payload: { wsPath: item.wsPath },
      });
      return {
        wsPath: item.wsPath,
        fileName,
        href,
        timestamp: item.timestamp,
      };
    };

    const isEmpty =
      last7days.length === 0 &&
      sortedPathsWithTimestamp.length === 0 &&
      recentOrdered.length === 0;

    return {
      recently: recentOrdered.map(toLinkObj),
      last7days: last7days.map(toLinkObj),
      all: sortedPathsWithTimestamp.map(toLinkObj),
      isEmpty,
    };
  }, [
    allWsPaths,
    recentWsPaths,
    sortedPathsWithTimestamp,
    allRecentWsPaths,
    coreServices.navigation.toUri,
  ]);
}
