import { useButton } from '@react-aria/button';
import { FocusRing } from '@react-aria/focus';
import React, { useRef } from 'react';

export function ExternalLink({ text, href }: { text: string; href: string }) {
  let ref = useRef<HTMLAnchorElement>(null);

  let { buttonProps } = useButton(
    {
      elementType: 'a',
    },
    ref,
  );

  return (
    <FocusRing focusRingClass="B-ui-components_misc-button-ring">
      <a
        {...buttonProps}
        ref={ref}
        target="_blank"
        href={href}
        className="underline outline-none rounded-sm"
        rel="noreferrer noopener"
        style={{
          color: 'var(--BV-window-link-color)',
        }}
      >
        {text}
      </a>
    </FocusRing>
  );
}
