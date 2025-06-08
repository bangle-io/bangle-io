import { t } from '@bangle.io/translations';
import { Star as StarIcon } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import * as React from 'react';
import { Button } from './button';
import { cn } from './cn';

type BaseButtonProps = ComponentPropsWithoutRef<typeof Button>;

interface StarButtonProps
  extends Omit<BaseButtonProps, 'onClick' | 'children'> {
  isStarred: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const StarButton = React.forwardRef<HTMLButtonElement, StarButtonProps>(
  ({ className, isStarred, onClick, title, ...props }, ref) => {
    const displayTitle =
      title || (isStarred ? t.app.common.unstarItem : t.app.common.starItem);

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        onClick={onClick}
        title={displayTitle}
        aria-label={displayTitle}
        aria-pressed={isStarred}
        className={cn(
          'h-7 w-7',
          isStarred
            ? 'text-yellow-500 hover:text-yellow-400'
            : 'text-muted-foreground',
          className,
        )}
        {...props}
      >
        <StarIcon
          className={cn('h-5 w-5', isStarred ? 'fill-current' : '')}
          aria-hidden="true"
        />
        <span className="sr-only">{displayTitle}</span>
      </Button>
    );
  },
);

StarButton.displayName = 'StarButton';

export { StarButton };
