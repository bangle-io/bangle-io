import type React from 'react';

import type { ApplicationStore } from '@bangle.io/create-store';

export function TestStoreProvider({
  bangleStore,
  bangleStoreChanged,
  children,
}: {
  bangleStore: ApplicationStore;
  bangleStoreChanged: number;
  children: React.ReactNode;
}) {
  return children;
}
