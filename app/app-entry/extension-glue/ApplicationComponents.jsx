import React, { useContext } from 'react';
import { useExtensionRegistryContext } from 'extension-registry';

export function ApplicationComponents() {
  const extensionRegistry = useExtensionRegistryContext();
  return extensionRegistry.renderApplicationComponents();
}
