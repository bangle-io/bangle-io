import { useCoreServices } from '@bangle.io/context';
import { Button } from '@bangle.io/ui-components';
import type { WsFilePath } from '@bangle.io/ws-path';
import { useAtom, useAtomValue } from 'jotai';
import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { useMemo } from 'react';

type LinkedMention = {
  href: string;
  label: string;
  wsPath: string;
};

export function LinkedMentions({
  currentWsPath,
}: {
  currentWsPath: WsFilePath;
}) {
  const coreServices = useCoreServices();
  const backlinkIndex = useAtomValue(
    coreServices.workspaceState.$backlinkIndex,
  );
  const [collapsed, setCollapsed] = useAtom(
    coreServices.workbenchState.$linkedMentionsCollapsed,
  );

  const items = useMemo<LinkedMention[]>(() => {
    const sourcePaths =
      backlinkIndex.byTargetWsPath.get(currentWsPath.wsPath) ?? [];
    return sourcePaths
      .filter((sourcePath) => sourcePath.wsPath !== currentWsPath.wsPath)
      .map((sourcePath) => ({
        wsPath: sourcePath.wsPath,
        label: sourcePath.filePath,
        href: coreServices.navigation.toUri({
          route: 'editor',
          payload: { wsPath: sourcePath.wsPath },
        }),
      }));
  }, [backlinkIndex.byTargetWsPath, coreServices.navigation, currentWsPath]);

  return (
    <section
      aria-labelledby="linked-mentions-heading"
      className="border-border border-t px-4 py-4 md:px-6"
    >
      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-controls="linked-mentions-content"
            aria-expanded={!collapsed}
            aria-label={
              collapsed
                ? t.app.editor.linkedMentions.expand
                : t.app.editor.linkedMentions.collapse
            }
            title={
              collapsed
                ? t.app.editor.linkedMentions.expand
                : t.app.editor.linkedMentions.collapse
            }
            onClick={() => setCollapsed((previous) => !previous)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </Button>
          <h2
            id="linked-mentions-heading"
            className="font-semibold text-muted-foreground text-sm"
          >
            {t.app.editor.linkedMentions.heading}
          </h2>
        </div>
        {!collapsed && (
          <div id="linked-mentions-content" className="flex flex-col gap-2">
            {backlinkIndex.status === 'loading' && items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.app.editor.linkedMentions.loading}
              </p>
            ) : backlinkIndex.status === 'error' && items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.app.editor.linkedMentions.error}
              </p>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t.app.editor.linkedMentions.empty}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {items.map((item) => (
                  <Button
                    key={item.wsPath}
                    variant="ghost"
                    asChild
                    className="h-auto justify-start px-2 py-1.5"
                  >
                    <a href={item.href} className="truncate">
                      {item.label}
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
