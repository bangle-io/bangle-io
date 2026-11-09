import { EDITOR_GUTTER_PADDING_LEFT } from '@bangle.io/constants';
import { useCoreServices } from '@bangle.io/context';
import { Button, buttonVariants, cn } from '@bangle.io/ui-components';
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
      className={cn(
        // Left padding follows the editor gutter so the section lines up
        // with the editor text.
        'border-border border-t py-4 pr-4 md:pr-6',
        EDITOR_GUTTER_PADDING_LEFT,
      )}
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
                  <a
                    key={item.wsPath}
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: 'ghost' }),
                      'h-auto justify-start truncate px-2 py-1.5',
                    )}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
