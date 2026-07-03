import { createAppError } from '@bangle.io/base-utils';
import { describe, expect, it, vi } from 'vitest';
import {
  createAssetFileName,
  getAssetDestination,
  writeAssetFile,
} from '../asset-storage';

const now = new Date(2026, 0, 2, 3, 4, 5, 6);

function testFile(name: string, type: string): File {
  const file = new File(['a'], name, { type });
  Object.defineProperty(file, 'name', { value: name });
  Object.defineProperty(file, 'type', { value: type });
  return file;
}

describe('asset storage naming', () => {
  it('creates default assets-folder destinations beside the note', () => {
    const destination = getAssetDestination({
      currentWsPath: 'workspace:notes/current.md',
      file: testFile('My Screenshot.PNG', 'image/png'),
      preference: 'assets-folder',
      now,
    });

    expect(destination?.wsPath).toBe(
      'workspace:notes/assets/my-screenshot-20260102-030405-006.png',
    );
  });

  it('creates adjacent destinations when requested', () => {
    const destination = getAssetDestination({
      currentWsPath: 'workspace:notes/current.md',
      file: testFile('Report.PDF', 'application/pdf'),
      preference: 'adjacent',
      now,
    });

    expect(destination?.wsPath).toBe(
      'workspace:notes/report-20260102-030405-006.pdf',
    );
  });

  it('falls back to MIME and safe default names', () => {
    expect(
      createAssetFileName({
        file: testFile('', 'image/webp'),
        now,
      }),
    ).toBe('image-20260102-030405-006.webp');
    expect(
      createAssetFileName({
        file: testFile('???', ''),
        now,
      }),
    ).toBe('asset-20260102-030405-006.bin');
  });

  it('treats image extensions as images when MIME type is empty', () => {
    expect(
      createAssetFileName({
        file: testFile('Pasted Image.PNG', ''),
        now,
      }),
    ).toBe('pasted-image-20260102-030405-006.png');
  });

  it('appends a collision suffix without overwriting the existing asset', async () => {
    const createFile = vi
      .fn<(wsPath: string, file: File) => Promise<void>>()
      .mockRejectedValueOnce(
        createAppError('error::file:already-existing', 'exists', {
          wsPath: 'workspace:notes/assets/report.pdf',
        }),
      )
      .mockResolvedValueOnce(undefined);

    const result = await writeAssetFile({
      currentWsPath: 'workspace:notes/current.md',
      file: testFile('Report.PDF', 'application/pdf'),
      preference: 'assets-folder',
      fileSystem: { createFile },
    });

    expect(createFile).toHaveBeenCalledTimes(2);
    expect(createFile.mock.calls[1]?.[0]).toMatch(/-2\.pdf$/);
    expect(result?.href).toMatch(/^assets\/report-.*-2\.pdf$/);
  });
});
