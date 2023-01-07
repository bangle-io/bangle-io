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
    <FocusRing focusRingClass="ring-promote">
      <a
        {...buttonProps}
        ref={ref}
        target="_blank"
        href={href}
        className="underline outline-none rounded-sm text-colorAppLinkText"
        rel="noreferrer noopener"
      >
        {text}
      </a>
    </FocusRing>
  );
}
