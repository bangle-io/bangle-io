import { useExtensionRegistryContext } from 'extension-registry';
import React from 'react';

export function ApplicationComponents() {
  const extensionRegistry = useExtensionRegistryContext();
  return <>{extensionRegistry.renderApplicationComponents()}</>;
}
