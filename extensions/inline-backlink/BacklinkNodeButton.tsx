import React, { useEffect } from 'react';

import { vars } from '@bangle.io/api';
import { NoteIcon, useHover } from '@bangle.io/ui-components';
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
        'B-inline-backlink_backlink-node hover:underline inline-flex gap-0_5 flex-row items-center rounded py-0 px-1 mx-1 text-start',
        linkNotFound && 'B-inline-backlink_backlink-node-not-found',
      )}
      // prevent the button from being dragged, which messes up our system
      // we want the node view to be dragged so the dom serializers can kick in
      draggable={false}
      onClick={onClick}
    >
      <span>
        <NoteIcon
          className="h-4 w-4 text-colorPromoteIcon"
          style={{
            fill: vars.misc.editorBacklinkBg,
          }}
        />
      </span>
      <span className="inline whitespace-break-spaces">{title}</span>
    </button>
  );
});
