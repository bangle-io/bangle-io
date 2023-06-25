import type { Node } from '@bangle.dev/pm';

import { readFileAsText as _readFileAsText } from '@bangle.io/baby-fs';
import { BaseError } from '@bangle.io/base-error';
import { DEBUG_WRITE_SLOWDOWN } from '@bangle.io/config';
import type {
  ExtensionRegistry,
  WorkspaceInfo,
  WsName,
  WsPath,
} from '@bangle.io/shared-types';
import { sleep } from '@bangle.io/utils';
import {
  createWsPath,
  isValidFileWsPath,
  resolvePath2,
} from '@bangle.io/ws-path';

import { WorkspaceInfoError } from './error';
import { markdownFormatProvider } from './note-format';
import { getStorageProviderObj } from './storage-providers';
import { readWorkspaceInfo } from './workspace-info';

function assertWsInfo(
  wsName: WsName,
  info: WorkspaceInfo | undefined,
): asserts info is WorkspaceInfo {
  if (!info) {
    throw new BaseError({
      code: WorkspaceInfoError.WorkspaceNotFound,
      message: `Workspace "${wsName}" not found`,
    });
  }
}

export function docToFile(
  wsPath: WsPath,
  doc: Node,
  extensionRegistry: ExtensionRegistry,
) {
  const { wsName, fileName } = resolvePath2(wsPath);

  const serialValue = getNoteFormatProvider(wsName).serializeNote(
    doc,
    extensionRegistry.specRegistry,
    fileName,
  );

  return new File([serialValue], fileName, {
    type: 'text/plain',
  });
}

export async function createNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
  doc: Node,
) {
  const file = docToFile(wsPath, doc, extensionRegistry);
  await createFile(wsPath, extensionRegistry, file);
}

export async function createFile(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
  file: File,
) {
  const wsName = resolvePath2(wsPath).wsName;

  if (DEBUG_WRITE_SLOWDOWN && DEBUG_WRITE_SLOWDOWN > 0) {
    console.warn('Slowing down write by ' + DEBUG_WRITE_SLOWDOWN + 'ms');
    await sleep(DEBUG_WRITE_SLOWDOWN);
  }

  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);
  const { options, provider } = getStorageProviderObj(info.type);
  await provider.createFile(wsPath, file, options);
}

export async function getNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
) {
  const textContent = await readFileAsText(wsPath);

  if (!textContent) {
    return undefined;
  }
  const { wsName } = resolvePath2(wsPath);

  const doc = getNoteFormatProvider(wsName).parseNote(
    textContent,
    extensionRegistry.specRegistry,
    extensionRegistry.markdownItPlugins,
  );

  return doc;
}

function getNoteFormatProvider(wsName: WsName) {
  // TODO implement custom format provider
  let provider = markdownFormatProvider;

  if (!provider) {
    throw new Error('Note storage provider not found.');
  }

  return provider;
}

export async function readFile(wsPath: WsPath): Promise<File | undefined> {
  const wsName = resolvePath2(wsPath).wsName;
  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);

  const { options, provider } = getStorageProviderObj(info.type);

  return provider.readFile(wsPath, options);
}

export async function fileExists(wsPath: WsPath): Promise<boolean> {
  const wsName = resolvePath2(wsPath).wsName;
  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);

  const { options, provider } = getStorageProviderObj(info.type);

  return provider.fileExists(wsPath, options);
}

export async function readFileAsText(
  wsPath: WsPath,
): Promise<string | undefined> {
  const file = await readFile(wsPath);

  if (file) {
    return _readFileAsText(file);
  }

  return undefined;
}

export async function renameFile(currentWsPath: WsPath, newWsPath: WsPath) {
  const { wsName: currentWsName } = resolvePath2(currentWsPath);
  const { wsName: newWsName } = resolvePath2(newWsPath);

  if (currentWsName !== newWsName) {
    throw new BaseError({
      code: WorkspaceInfoError.FileRenameNotAllowed,
      message: `Cannot rename file ${currentWsPath} to ${newWsPath} as they are in different workspaces`,
    });
  }

  const wsInfo = await readWorkspaceInfo(currentWsName);
  assertWsInfo(currentWsName, wsInfo);
  const { options, provider } = getStorageProviderObj(wsInfo.type);

  await provider.renameFile(currentWsPath, newWsPath, options);
}

export async function writeNote(
  wsPath: WsPath,
  extensionRegistry: ExtensionRegistry,
  doc: Node,
) {
  await writeFile(wsPath, docToFile(wsPath, doc, extensionRegistry));
}

export async function writeFile(wsPath: WsPath, file: File, sha?: string) {
  const wsName = resolvePath2(wsPath).wsName;

  if (DEBUG_WRITE_SLOWDOWN && DEBUG_WRITE_SLOWDOWN > 0) {
    console.warn('Slowing down write by ' + DEBUG_WRITE_SLOWDOWN + 'ms');
    await sleep(DEBUG_WRITE_SLOWDOWN);
  }

  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);
  const { options, provider } = getStorageProviderObj(info.type);
  await provider.writeFile(wsPath, file, options, sha);
}

export async function deleteFile(wsPath: WsPath) {
  const wsName = resolvePath2(wsPath).wsName;

  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);

  const { options, provider } = getStorageProviderObj(info.type);
  await provider.deleteFile(wsPath, options);
}

export async function listFiles(
  wsName: WsName,
  abortSignal: AbortSignal,
): Promise<WsPath[]> {
  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);

  const { options, provider } = getStorageProviderObj(info.type);

  let result = await provider.listAllFiles(abortSignal, wsName, options);

  return result
    .filter((w) => {
      const result = isValidFileWsPath(w);

      if (!result) {
        console.warn(`Invalid file path ${w}`);
      }

      return result;
    })
    .map((w) => createWsPath(w));
}
