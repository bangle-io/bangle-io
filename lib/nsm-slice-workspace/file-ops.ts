import type { ExtensionRegistry } from '@bangle.io/shared-types';
import * as fs from '@bangle.io/workspace-info';
import { resolvePath } from '@bangle.io/ws-path';

import { markdownFormatProvider } from './note-format';

export async function getNote(
  wsPath: string,
  extensionRegistry: ExtensionRegistry,
) {
  const wsName = resolvePath(wsPath).wsName;

  const info = await fs.readWorkspaceInfo(wsName);

  if (!info) {
    throw new Error(`Workspace ${wsName} not found`);
  }

  const textContent = await fs.readFileAsText(wsPath, info?.type);

  if (!textContent) {
    return undefined;
  }
  const doc = getNoteFormatProvider(wsName).parseNote(
    textContent,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  );

  return doc;
}

function getNoteFormatProvider(wsName: string) {
  // TODO implement custom format provider
  let provider = markdownFormatProvider;

  if (!provider) {
    throw new Error('Note storage provider not found.');
  }

  return provider;
}
