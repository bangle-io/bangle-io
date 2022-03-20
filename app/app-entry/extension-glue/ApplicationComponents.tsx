import React from 'react';

import { useExtensionRegistryContext } from '@bangle.io/extension-registry';

export function ApplicationComponents() {
  const extensionRegistry = useExtensionRegistryContext();

  return <>{extensionRegistry.renderApplicationComponents()}</>;
}
