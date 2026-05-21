import type { WorkspaceMetadata } from '@bangle.io/types';
import {
  getAttachmentDestinationPaths,
  resolveImageWsPath,
  resolveWorkspaceAttachmentConfig,
} from '../attachments';

describe('attachments helpers', () => {
  test('returns defaults when workspace metadata has no attachment config', () => {
    expect(resolveWorkspaceAttachmentConfig(undefined)).toEqual({
      mode: 'relative',
      directory: '_anexos',
      fileNamePrefix: 'Pasted image',
    });
  });

  test('normalizes attachment config from metadata', () => {
    const metadata: WorkspaceMetadata = {
      attachments: {
        mode: 'root',
        directory: '/assets/',
        fileNamePrefix: 'Image',
      },
    };

    expect(resolveWorkspaceAttachmentConfig(metadata)).toEqual({
      mode: 'root',
      directory: 'assets',
      fileNamePrefix: 'Image',
    });
  });

  test('resolves relative image source against current note path', () => {
    const wsPath = resolveImageWsPath(
      'notion:_FERRAMENTAS/arping.md',
      '_anexos/Pasted%20image.png',
      {
        mode: 'relative',
        directory: '_anexos',
        fileNamePrefix: 'Pasted image',
      },
    );

    expect(wsPath).toBe('notion:_FERRAMENTAS/_anexos/Pasted image.png');
  });

  test('resolves root mode image source from workspace root', () => {
    const wsPath = resolveImageWsPath(
      'notion:_FERRAMENTAS/arping.md',
      '/_anexos/Pasted%20image.png',
      {
        mode: 'root',
        directory: '_anexos',
        fileNamePrefix: 'Pasted image',
      },
    );

    expect(wsPath).toBe('notion:_anexos/Pasted image.png');
  });

  test('builds destination paths for image paste in relative mode', () => {
    expect(
      getAttachmentDestinationPaths(
        'notion:_FERRAMENTAS/arping.md',
        'Pasted image.png',
        {
          mode: 'relative',
          directory: '_anexos',
          fileNamePrefix: 'Pasted image',
        },
      ),
    ).toEqual({
      wsPath: 'notion:_FERRAMENTAS/_anexos/Pasted image.png',
      markdownPath: '_anexos/Pasted image.png',
    });
  });

  test('builds destination paths for image paste in root mode', () => {
    expect(
      getAttachmentDestinationPaths(
        'notion:_FERRAMENTAS/arping.md',
        'Pasted image.png',
        {
          mode: 'root',
          directory: '_anexos',
          fileNamePrefix: 'Pasted image',
        },
      ),
    ).toEqual({
      wsPath: 'notion:_anexos/Pasted image.png',
      markdownPath: '/_anexos/Pasted image.png',
    });
  });
});
