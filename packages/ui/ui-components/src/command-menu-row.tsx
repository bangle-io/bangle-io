import { cn } from '@bangle.io/ui-misc';
import React from 'react';
import { KbdShortcut } from './kbd';

/**
 * Shared row body for command-style menus (omni search, editor slash menu):
 * an optional icon tile, a title with an optional secondary description, and
 * an optional keyboard shortcut aligned to the right. Render it as the child
 * of a `CommandItem` so every command surface shares one look.
 */
export function CommandMenuRow({
  icon,
  title,
  description,
  keybindings,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  keybindings?: string | string[] | readonly string[];
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-2.5', className)}>
      {icon && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
        {description && (
          <span className="truncate text-muted-foreground text-xs">
            {description}
          </span>
        )}
      </div>
      {keybindings && <KbdShortcut keys={keybindings} />}
    </div>
  );
}
