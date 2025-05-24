import { Button } from '@bangle.io/ui-components';
import React from 'react';

export interface Item {
  label: string;
  href: string;
  rightElement?: React.ReactNode;
}

interface ItemListProps {
  heading: string;
  items: Item[];
  emptyMessage: string;
  showViewMore?: boolean;
  onClickViewMore?: () => void;
}

/**
 * Renders a list of navigable items (links) with a heading, optional right element,
 * and a 'View More' option.
 */
export function ItemList({
  heading,
  items,
  emptyMessage,
  showViewMore,
  onClickViewMore,
}: ItemListProps) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-4">
      {items.length > 0 ? (
        <>
          <h3 className="w-full self-start pl-3 font-semibold text-muted-foreground text-sm">
            {heading}
          </h3>
          <div className="flex w-full flex-col gap-1">
            {items.map(({ label, href, rightElement }) => (
              <Button
                key={label + href}
                variant="ghost"
                asChild
                className="h-auto w-full justify-between px-3 py-1.5 text-left"
              >
                <a href={href} className="flex items-center justify-between">
                  <span className="truncate font-medium">{label}</span>
                  {rightElement && (
                    <span className="ml-2 shrink-0">{rightElement}</span>
                  )}
                </a>
              </Button>
            ))}
            {showViewMore && onClickViewMore && (
              <Button
                variant="ghost"
                onClick={onClickViewMore}
                className="h-auto w-full justify-between px-3 py-1.5 text-left text-sm"
              >
                <span className="font-medium">{t.app.common.viewAll}</span>
                <span className="text-sm">→</span>
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="py-4 text-center text-muted-foreground text-sm">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
