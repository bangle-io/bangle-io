import { isDarwin } from '@bangle.io/base-utils';
import React from 'react';
import { cn } from './cn';

export function Kbd({ keys }: { keys: string | string[] | readonly string[] }) {
  const isMac = isDarwin;

  const keySymbols = (typeof keys === 'string' ? keys.split('-') : keys).map(
    (key) => {
      switch (key.toLowerCase()) {
        case 'meta':
          return '⌘';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'shift':
          return '⇧';
        case 'ctrl':
          return isMac ? '⌃' : 'Ctrl';
        case 'enter':
          return '⏎';
        default:
          return key.charAt(0).toUpperCase();
      }
    },
  );

  return <kbd className="kbd">{keySymbols.join('')}</kbd>;
}

const KbdShortcut = ({
  className,
  keys,
  ...props
}: Omit<
  React.HTMLAttributes<HTMLSpanElement> & {
    keys: string | string[] | readonly string[];
  },
  'children'
>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60 ', className)}
      {...props}
    >
      <Kbd keys={keys} />
    </span>
  );
};
KbdShortcut.displayName = 'KbdShortcut';

export { KbdShortcut };
