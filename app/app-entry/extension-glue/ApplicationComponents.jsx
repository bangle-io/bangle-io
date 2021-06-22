import React, { useContext } from 'react';
import { ExtensionRegistryContext } from 'extension-registry';

export function ApplicationComponents() {
  const extensionRegistry = useContext(ExtensionRegistryContext);
  return extensionRegistry.renderApplicationComponents();
}
