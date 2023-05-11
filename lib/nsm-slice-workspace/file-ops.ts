import type {
  ExtensionRegistry,
  WsName,
  WsPath,
} from '@bangle.io/shared-types';
import * as fs from '@bangle.io/workspace-info';
import { createWsPath, resolvePath, resolvePath2 } from '@bangle.io/ws-path';

import { markdownFormatProvider } from './note-format';

export async function getNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
) {
  const wsName = resolvePath2(wsPath).wsName;

  const info = await fs.readWorkspaceInfo(wsName);

  if (!info) {
    throw new Error(`Workspace ${wsName} not found`);
  }

  const textContent = await fs.readFileAsText(wsPath, info.type);

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

export async function deleteNote(wsPath: WsPath) {
  const wsName = resolvePath(wsPath).wsName;

  const info = await fs.readWorkspaceInfo(wsName);

  if (!info) {
    throw new Error(`Workspace ${wsName} not found`);
  }

  await fs.deleteFile(wsPath, info?.type);
}

export async function listFiles(
  wsName: WsName,
  abortSignal: AbortSignal = new AbortController().signal,
): Promise<WsPath[]> {
  const info = await fs.readWorkspaceInfo(wsName);

  if (!info) {
    throw new Error(`Workspace ${wsName} not found`);
  }

  let result = await fs.listAllFiles(abortSignal, wsName, info?.type);

  return result.map((w) => createWsPath(w));
}

function getNoteFormatProvider(wsName: WsName) {
  // TODO implement custom format provider
  let provider = markdownFormatProvider;

  if (!provider) {
    throw new Error('Note storage provider not found.');
  }

  return provider;
}
