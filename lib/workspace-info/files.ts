import { readFileAsText as _readFileAsText } from '@bangle.io/baby-fs';
import { BaseError } from '@bangle.io/base-error';
import type { WorkspaceInfo, WsName, WsPath } from '@bangle.io/shared-types';
import {
  createWsPath,
  isValidFileWsPath,
  resolvePath2,
} from '@bangle.io/ws-path';

import { getStorageProviderObj } from './storage-providers';
import { readWorkspaceInfo } from './workspace-info';

function assertWsInfo(
  wsName: WsName,
  info: WorkspaceInfo | undefined,
): asserts info is WorkspaceInfo {
  if (!info) {
    throw new Error(`Workspace ${wsName} not found`);
  }
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
      message: `Cannot rename file ${currentWsPath} to ${newWsPath} as they are in different workspaces`,
    });
  }

  const wsInfo = await readWorkspaceInfo(currentWsName);
  assertWsInfo(currentWsName, wsInfo);
  const { options, provider } = getStorageProviderObj(wsInfo.type);

  await provider.renameFile(currentWsPath, newWsPath, options);
}

export async function writeFile(wsPath: WsPath, file: File, sha?: string) {
  const wsName = resolvePath2(wsPath).wsName;

  const info = await readWorkspaceInfo(wsName);

  assertWsInfo(wsName, info);

  const exists = await fileExists(wsPath);

  if (exists) {
    throw new BaseError({ message: `File ${wsPath} already exists` });
  }

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
