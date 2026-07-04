import { createAppError, getAppErrorCause } from '@bangle.io/base-utils';
import { describe, expect, it, vi } from 'vitest';
import {
  createAssetFileName,
  getAssetDestination,
  storeWorkspaceAssetFiles,
  writeAssetFile,
} from '../asset-storage';

const now = new Date(2026, 0, 2, 3, 4, 5, 6);

function testFileSystem(
  createFile: (wsPath: string, file: File) => Promise<void>,
) {
  return {
    createFile,
    getMaxFileSizeBytes: vi.fn<() => Promise<number>>().mockResolvedValue(1024),
  };
}

function testFile(name: string, type: string): File {
  const file = new File(['a'], name, { type });
  Object.defineProperty(file, 'name', { value: name });
  Object.defineProperty(file, 'type', { value: type });
  return file;
}

describe('asset storage naming', () => {
  it('creates default assets-folder destinations beside the note', () => {
    const destination = getAssetDestination({
      sourceWsPath: 'workspace:notes/current.md',
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
      sourceWsPath: 'workspace:notes/current.md',
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
      sourceWsPath: 'workspace:notes/current.md',
      file: testFile('Report.PDF', 'application/pdf'),
      preference: 'assets-folder',
      fileSystem: testFileSystem(createFile),
    });

    expect(createFile).toHaveBeenCalledTimes(2);
    expect(createFile.mock.calls[1]?.[0]).toMatch(/-2\.pdf$/);
    expect(result?.href).toMatch(/^assets\/report-.*-2\.pdf$/);
  });

  it('stores files as reusable asset records without editor context', async () => {
    const createFile = vi
      .fn<(wsPath: string, file: File) => Promise<void>>()
      .mockResolvedValue(undefined);
    const files = [
      testFile('Screenshot.PNG', 'image/png'),
      testFile('Report.PDF', 'application/pdf'),
    ];

    const result = await storeWorkspaceAssetFiles({
      sourceWsPath: 'workspace:notes/current.md',
      files,
      preference: 'assets-folder',
      fileSystem: testFileSystem(createFile),
    });

    expect(createFile).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      expect.objectContaining({
        file: files[0],
        href: expect.stringMatching(/^assets\/screenshot-.*\.png$/),
        label: 'Screenshot.PNG',
        isImage: true,
      }),
      expect.objectContaining({
        file: files[1],
        href: expect.stringMatching(/^assets\/report-.*\.pdf$/),
        label: 'Report.PDF',
        isImage: false,
      }),
    ]);
  });

  it('reports per-file storage failures and keeps later files in order', async () => {
    const failure = new Error('quota exceeded');
    const createFile = vi
      .fn<(wsPath: string, file: File) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);
    const onFileError = vi.fn();
    const files = [
      testFile('one.png', 'image/png'),
      testFile('two.pdf', 'application/pdf'),
      testFile('three.txt', 'text/plain'),
    ];

    const result = await storeWorkspaceAssetFiles({
      sourceWsPath: 'workspace:notes/current.md',
      files,
      preference: 'adjacent',
      fileSystem: testFileSystem(createFile),
      onFileError,
    });

    expect(onFileError).toHaveBeenCalledWith({
      file: files[1],
      cause: failure,
      error: failure,
      sourceWsPath: 'workspace:notes/current.md',
      targetDirectoryWsPath: undefined,
    });
    expect(result.map((asset) => asset.file)).toEqual([files[0], files[2]]);
  });

  it('stops starting new asset writes after cancellation', async () => {
    const abortController = new AbortController();
    const createFile = vi
      .fn<(wsPath: string, file: File) => Promise<void>>()
      .mockImplementationOnce(async () => {
        abortController.abort();
      })
      .mockResolvedValue(undefined);
    const files = [
      testFile('one.png', 'image/png'),
      testFile('two.pdf', 'application/pdf'),
    ];

    const result = await storeWorkspaceAssetFiles({
      sourceWsPath: 'workspace:notes/current.md',
      files,
      preference: 'adjacent',
      fileSystem: testFileSystem(createFile),
      signal: abortController.signal,
    });

    expect(createFile).toHaveBeenCalledTimes(1);
    expect(result.map((asset) => asset.file)).toEqual([files[0]]);
  });

  it('can store directly into a target directory without Markdown source context', async () => {
    const createFile = vi
      .fn<(wsPath: string, file: File) => Promise<void>>()
      .mockResolvedValue(undefined);
    const file = testFile('Dropped PDF.pdf', 'application/pdf');

    const result = await storeWorkspaceAssetFiles({
      targetDirectoryWsPath: 'workspace:incoming/assets/',
      files: [file],
      preference: 'assets-folder',
      fileSystem: testFileSystem(createFile),
    });

    expect(createFile).toHaveBeenCalledWith(
      expect.stringMatching(
        /^workspace:incoming\/assets\/dropped-pdf-.*\.pdf$/,
      ),
      file,
    );
    expect(result).toEqual([
      expect.objectContaining({
        file,
        href: undefined,
        label: 'Dropped PDF.pdf',
        isImage: false,
      }),
    ]);
  });

  it('rejects files larger than the destination storage provider limit before writing', async () => {
    const createFile = vi
      .fn<(wsPath: string, file: File) => Promise<void>>()
      .mockResolvedValue(undefined);
    const fileSystem = {
      createFile,
      getMaxFileSizeBytes: vi.fn<() => Promise<number>>().mockResolvedValue(2),
    };
    const file = testFile('Huge.mov', 'video/quicktime');
    Object.defineProperty(file, 'size', { value: 3 });

    await expect(
      writeAssetFile({
        sourceWsPath: 'workspace:notes/current.md',
        file,
        preference: 'assets-folder',
        fileSystem,
      }),
    ).rejects.toSatisfy((error) => {
      expect(getAppErrorCause(error)).toMatchObject({
        name: 'error::file:size-too-large',
        payload: {
          fileName: 'Huge.mov',
          fileSizeBytes: 3,
          maxFileSizeBytes: 2,
          wsPath: expect.stringMatching(
            /^workspace:notes\/assets\/huge-.*\.mov$/,
          ),
        },
      });
      return true;
    });
    expect(createFile).not.toHaveBeenCalled();
  });
});
