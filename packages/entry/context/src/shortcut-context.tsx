import { isDarwin } from '@bangle.io/browser';
import { ShortcutManager } from '@bangle.io/keyboard-shortcuts';
import React, { useEffect, createContext } from 'react';

const shortcutManager = new ShortcutManager({
  isDarwin: isDarwin,
});

export const ShortcutContext = createContext(shortcutManager);

export function useShortcutManager() {
  return React.useContext(ShortcutContext);
}

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const eventHandler = (event: KeyboardEvent) =>
      shortcutManager.handleEvent(event);

    document.addEventListener('keydown', eventHandler);

    return () => {
      document.removeEventListener('keydown', eventHandler);
      shortcutManager.deregisterAll();
    };
  }, []);

  return (
    <ShortcutContext.Provider value={shortcutManager}>
      {children}
    </ShortcutContext.Provider>
  );
}
