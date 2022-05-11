import React, { useEffect } from 'react';

import { useHover } from '@bangle.io/ui-bangle-button';
import { NoteIcon } from '@bangle.io/ui-components';
import { cx, useDebouncedValue } from '@bangle.io/utils';

export const BacklinkNodeButton = React.forwardRef<
  HTMLButtonElement,
  {
    title: string;
    onHoverChange: (isHovered: boolean) => void;
    linkNotFound: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  }
>(({ onHoverChange, title, linkNotFound, onClick }, ref) => {
  const { hoverProps, isHovered } = useHover({ isDisabled: false });

  const debIsHovered = useDebouncedValue(isHovered, {
    maxWait: 300,
    wait: 100,
  });

  useEffect(() => {
    onHoverChange(debIsHovered);
  }, [debIsHovered, onHoverChange]);

  return (
    <button
      ref={ref}
      {...hoverProps}
      aria-label={title}
      data-testid="inline-backlink-button"
      className={cx(
        'B-inline-backlink_backlink',
        linkNotFound && 'B-inline-backlink_backlinkNotFound',
      )}
      // prevent the button from being dragged, which messes up our system
      // we want the node view to be dragged so the dom serializers can kick in
      draggable={false}
      onClick={onClick}
    >
      <NoteIcon className="inline-block" />
      <span className="inline">{title}</span>
    </button>
  );
});
