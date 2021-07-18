import { useExtensionRegistryContext } from 'extension-registry';

export function ApplicationComponents() {
  const extensionRegistry = useExtensionRegistryContext();
  return extensionRegistry.renderApplicationComponents();
}
