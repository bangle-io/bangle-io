import { DEFAULT_WORKSPACE_ATTACHMENT_CONFIG } from '@bangle.io/constants';
import type {
  WorkspaceAttachmentConfig,
  WorkspaceMetadata,
} from '@bangle.io/types';
import { WsPath } from '@bangle.io/ws-path';

const EXTERNAL_SRC_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function normalizeAttachmentDirectory(directory: string): string {
  const normalized = directory.trim().replace(/^\/+|\/+$/g, '');
  return normalized || DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.directory;
}

function normalizeAttachmentFileNamePrefix(prefix: string): string {
  const invalidCharRegex = /[<>:"/\\|?*]/g;
  const normalized = prefix
    .trim()
    .replace(invalidCharRegex, '')
    .split('')
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('');

  return normalized || DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.fileNamePrefix;
}

export function resolveWorkspaceAttachmentConfig(
  metadata: WorkspaceMetadata | undefined,
): WorkspaceAttachmentConfig {
  const config = metadata?.attachments;
  const mode = config?.mode === 'root' ? 'root' : 'relative';

  return {
    mode,
    directory: normalizeAttachmentDirectory(
      config?.directory || DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.directory,
    ),
    fileNamePrefix: normalizeAttachmentFileNamePrefix(
      config?.fileNamePrefix ||
        DEFAULT_WORKSPACE_ATTACHMENT_CONFIG.fileNamePrefix,
    ),
  };
}

export function resolveImageWsPath(
  noteWsPath: string,
  imageSrc: string,
  config: WorkspaceAttachmentConfig,
): string | undefined {
  const src = imageSrc.trim();
  if (!src || src.startsWith('#') || src.startsWith('//')) {
    return undefined;
  }
  if (EXTERNAL_SRC_REGEX.test(src)) {
    return undefined;
  }

  const notePath = WsPath.assertFile(noteWsPath);
  const rawPath = src.split('#')[0]?.split('?')[0] || '';
  if (!rawPath) {
    return undefined;
  }

  let normalizedSrc = rawPath;
  try {
    normalizedSrc = decodeURIComponent(rawPath);
  } catch {
    // Keep original value when it is not a valid encoded URI component.
  }

  const cleanedSrc = normalizedSrc.replace(/^\.?\//, '');
  const filePath = normalizedSrc.startsWith('/')
    ? normalizedSrc.slice(1)
    : config.mode === 'root'
      ? cleanedSrc === config.directory ||
        cleanedSrc.startsWith(`${config.directory}/`)
        ? cleanedSrc
        : WsPath.pathJoin(config.directory, cleanedSrc)
      : WsPath.pathJoin(notePath.getParent()?.path || '', cleanedSrc);

  if (!filePath) {
    return undefined;
  }

  return WsPath.fromParts(notePath.wsName, filePath).wsPath;
}

export function getAttachmentDestinationPaths(
  noteWsPath: string,
  fileName: string,
  config: WorkspaceAttachmentConfig,
): {
  wsPath: string;
  markdownPath: string;
} {
  const notePath = WsPath.assertFile(noteWsPath);
  const parentDir = notePath.getParent()?.path || '';
  const attachmentDir =
    config.mode === 'root'
      ? config.directory
      : WsPath.pathJoin(parentDir, config.directory);

  const wsPath = WsPath.fromParts(
    notePath.wsName,
    WsPath.pathJoin(attachmentDir, fileName),
  ).wsPath;

  return {
    wsPath,
    markdownPath:
      config.mode === 'root'
        ? `/${WsPath.pathJoin(config.directory, fileName)}`
        : WsPath.pathJoin(config.directory, fileName),
  };
}
