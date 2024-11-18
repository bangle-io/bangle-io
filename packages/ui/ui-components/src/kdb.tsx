import { isDarwin } from '@bangle.io/base-utils';
import { cn } from '@bangle.io/ui-utils';
import React from 'react';

export function Kbd({ keys }: { keys: string }) {
  const isMac = isDarwin;

  const keySymbols = keys.split('-').map((key) => {
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
  });

  return <kbd className="kbd">{keySymbols.join('')}</kbd>;
}

const KbdShortcut = ({
  className,
  keys,
  ...props
}: Omit<
  React.HTMLAttributes<HTMLSpanElement> & {
    keys: string;
  },
  'children'
>) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest opacity-60', className)}
      {...props}
    >
      <Kbd keys={keys} />
    </span>
  );
};
KbdShortcut.displayName = 'KbdShortcut';

export { KbdShortcut };
