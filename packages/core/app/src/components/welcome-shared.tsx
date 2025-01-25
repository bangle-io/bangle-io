import { useCoreServices } from '@bangle.io/context';
import { Button } from '@bangle.io/ui-components';
import bangleIcon from '@bangle.io/ui-components/src/bangle-transparent_x512.png';
import { WsPath, buildURL, buildUrlPath } from '@bangle.io/ws-path';
import { differenceInYears, formatDistanceToNow } from 'date-fns';
import { useAtomValue } from 'jotai';
import React from 'react';
export interface Item {
  label: string;
  href: string;
  relativeTime?: string | null;
}

interface HeaderProps {
  title: string;
  illustration?: React.ReactNode;
}

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
      const href = buildURL(buildUrlPath.pageEditor({ wsPath: item.wsPath }));
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
  }, [allWsPaths, recentWsPaths, sortedPathsWithTimestamp, allRecentWsPaths]);
}

export function Header({ title, illustration }: HeaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      {illustration ? (
        <div className="mb-4 flex justify-center opacity-40">
          {illustration}
        </div>
      ) : (
        <a
          href="https://bangle.io"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-opacity hover:opacity-60"
        >
          <img
            src={bangleIcon}
            alt="Bangle logo"
            className="h-28 w-28 opacity-40 grayscale"
          />
        </a>
      )}

      <h2 className="font-semibold text-xl tracking-widest">{title}</h2>
    </div>
  );
}

interface ItemListProps {
  heading: string;
  items: Item[];
  emptyMessage: string;
  showViewMore?: boolean;
  onClickViewMore?: () => void;
}

export function ItemList({
  heading,
  items,
  emptyMessage,
  showViewMore,
  onClickViewMore,
}: ItemListProps) {
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-3 px-4">
      {items.length > 0 ? (
        <>
          <h3 className="self-start font-semibold text-muted-foreground text-sm">
            {heading}
          </h3>
          <div className="flex w-full flex-col gap-2">
            {items.map(({ label, href, relativeTime }) => (
              <Button
                key={label}
                variant="ghost"
                asChild
                className="flex w-full items-center justify-between"
              >
                <a href={href}>
                  <span className="font-medium">{label}</span>
                  {relativeTime && (
                    <span className="text-muted-foreground text-sm">
                      {relativeTime}
                    </span>
                  )}
                </a>
              </Button>
            ))}
            {showViewMore && onClickViewMore && (
              <Button
                variant="ghost"
                onClick={onClickViewMore}
                className="flex w-full items-center justify-between"
              >
                <span className="font-medium">View all</span>
                <span className="text-sm">→</span>
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground text-sm">{emptyMessage}</div>
      )}
    </div>
  );
}

interface Action {
  label: string;
  variant?: 'default' | 'outline' | 'ghost';
  onClick: () => void;
}

interface ActionsProps {
  actions: Action[];
}

export function Actions({ actions }: ActionsProps) {
  return (
    <div className="mt-3 flex flex-col justify-center gap-4 sm:flex-row">
      {actions.map((btn) => (
        <Button
          key={btn.label}
          onClick={btn.onClick}
          variant={btn.variant ?? 'default'}
        >
          {btn.label}
        </Button>
      ))}
    </div>
  );
}

export function getRelativeTimeOrNull(timestamp: number): string | null {
  if (differenceInYears(new Date(), new Date(timestamp)) >= 1) {
    return null;
  }
  return formatDistanceToNow(timestamp, { addSuffix: true });
}
