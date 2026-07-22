import type { PrivacySafeErrorReport } from '@bangle.io/types';
import { describe, expect, test } from 'vitest';
import {
  createPrivacySafeErrorReport,
  getCurrentBuildAssetDebugIds,
  getPrivacySafeStackFrames,
  isPrivacySafeErrorReport,
} from '../privacy-safe-error-report';

const PRIVATE_MARKERS = [
  'SECRET_NOTE_CONTENT',
  'PRIVATE_WORKSPACE',
  'PRIVATE_NOTE.md',
  'PRIVATE_CAUSE',
  'PRIVATE_PROPERTY',
  'browser-extension.example',
];
const DEBUG_ID = '4c346747-7b26-4ea3-9657-1f6776a4e8b2';
const INDEX_ASSET = '/assets/index-abcdef12.js';

function makeReport(): PrivacySafeErrorReport {
  const error = new TypeError('SECRET_NOTE_CONTENT', {
    cause: new Error('PRIVATE_CAUSE'),
  });
  Object.assign(error, {
    wsPath: 'PRIVATE_WORKSPACE:PRIVATE_NOTE.md',
    privateProperty: 'PRIVATE_PROPERTY',
  });
  error.stack = [
    'TypeError: SECRET_NOTE_CONTENT',
    '    at save (https://app.bangle.io/assets/index-abcdef12.js?wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md:10:20)',
    '    at extension (https://browser-extension.example/PRIVATE_NOTE.md:30:40)',
  ].join('\n');

  return createPrivacySafeErrorReport(error, {
    id: 'fb3b15d4-c536-4bf5-8d06-f328247b9619',
    capturedAt: '2026-07-19T12:00:00.000Z',
    route: 'editor',
    release: 'bangle.io@1.2.3+abcdef12',
    environment: 'production',
    buildAssetDebugIds: new Map([[INDEX_ASSET, DEBUG_ID]]),
  });
}

describe('privacy-safe error reports', () => {
  test('reconstructs an allowlisted report without user-controlled error data', () => {
    const report = makeReport();
    const serialized = JSON.stringify(report);

    expect(report).toEqual({
      schemaVersion: 2,
      id: 'fb3b15d4-c536-4bf5-8d06-f328247b9619',
      capturedAt: '2026-07-19T12:00:00.000Z',
      errorType: 'TypeError',
      route: 'editor',
      release: 'bangle.io@1.2.3+abcdef12',
      environment: 'production',
      frames: [
        {
          debugId: DEBUG_ID,
          filename: `/assets/bangle-${DEBUG_ID}.js`,
          lineNumber: 10,
          columnNumber: 20,
        },
      ],
    });
    for (const marker of PRIVATE_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  test('maps custom names and routes to fixed values', () => {
    const error = new Error('SECRET_NOTE_CONTENT');
    error.name = 'PRIVATE_WORKSPACE';
    const report = createPrivacySafeErrorReport(error, {
      id: 'fb3b15d4-c536-4bf5-8d06-f328247b9619',
      capturedAt: '2026-07-19T12:00:00.000Z',
      route: 'PRIVATE_NOTE.md',
      release: 'bangle.io@1.2.3+abcdef12',
      environment: 'production',
    });

    expect(report.errorType).toBe('Error');
    expect(report.route).toBe('unknown');
  });

  test('uses a build debug ID for any loaded chunk and drops its raw name', () => {
    const assetPath = '/assets/future-editor-SECRET_NOTE_CONTENT-abcdef12.js';
    const frames = getPrivacySafeStackFrames(
      `Error: hidden\n at x (https://app.bangle.io${assetPath}?wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md:7:9)`,
      new Map([[assetPath, DEBUG_ID]]),
    );

    expect(frames).toEqual([
      {
        debugId: DEBUG_ID,
        filename: `/assets/bangle-${DEBUG_ID}.js`,
        lineNumber: 7,
        columnNumber: 9,
      },
    ]);
    expect(JSON.stringify(frames)).not.toContain('SECRET_NOTE_CONTENT');
    expect(JSON.stringify(frames)).not.toContain('PRIVATE_WORKSPACE');
    expect(JSON.stringify(frames)).not.toContain('PRIVATE_NOTE.md');
  });

  test('reads only validated build asset debug IDs from the injected registry', () => {
    const globalWithDebugIds = globalThis as typeof globalThis & {
      _sentryDebugIds?: Record<string, unknown>;
    };
    globalWithDebugIds._sentryDebugIds = {
      [`Error\n at https://app.bangle.io${INDEX_ASSET}:1:1`]: DEBUG_ID,
      'Error\n at https://app.bangle.io/assets/private-note.js:1:1':
        'PRIVATE_WORKSPACE',
    };
    try {
      expect(getCurrentBuildAssetDebugIds()).toEqual(
        new Map([[INDEX_ASSET, DEBUG_ID]]),
      );
    } finally {
      delete globalWithDebugIds._sentryDebugIds;
    }
  });

  test('keeps first-line Firefox and single-line Safari frames', () => {
    const buildAssets = new Map([[INDEX_ASSET, DEBUG_ID]]);

    expect(
      getPrivacySafeStackFrames(
        `save@https://app.bangle.io${INDEX_ASSET}:10:20`,
        buildAssets,
      ),
    ).toEqual([
      {
        columnNumber: 20,
        debugId: DEBUG_ID,
        filename: `/assets/bangle-${DEBUG_ID}.js`,
        lineNumber: 10,
      },
    ]);
    expect(
      getPrivacySafeStackFrames(
        `https://app.bangle.io${INDEX_ASSET}:30:40`,
        buildAssets,
      ),
    ).toEqual([
      {
        columnNumber: 40,
        debugId: DEBUG_ID,
        filename: `/assets/bangle-${DEBUG_ID}.js`,
        lineNumber: 30,
      },
    ]);
  });

  test('does not treat an asset-shaped error message as a stack frame', () => {
    const frames = getPrivacySafeStackFrames(
      `Error: PRIVATE@email.example https://app.bangle.io${INDEX_ASSET}?note=PRIVATE_NOTE.md:123456:789`,
      new Map([[INDEX_ASSET, DEBUG_ID]]),
    );

    expect(frames).toEqual([]);
  });

  test('reads a debug ID from a first-line injected stack', () => {
    const globalWithDebugIds = globalThis as typeof globalThis & {
      _sentryDebugIds?: Record<string, unknown>;
    };
    globalWithDebugIds._sentryDebugIds = {
      [`https://app.bangle.io${INDEX_ASSET}:1:1`]: DEBUG_ID,
    };
    try {
      expect(getCurrentBuildAssetDebugIds()).toEqual(
        new Map([[INDEX_ASSET, DEBUG_ID]]),
      );
    } finally {
      delete globalWithDebugIds._sentryDebugIds;
    }
  });

  test('rejects reports and frames with any non-allowlisted field', () => {
    const report = makeReport();

    expect(isPrivacySafeErrorReport(report)).toBe(true);
    expect(
      isPrivacySafeErrorReport({
        ...report,
        noteName: 'PRIVATE_NOTE.md',
      }),
    ).toBe(false);
    expect(
      isPrivacySafeErrorReport({
        ...report,
        frames: [
          {
            ...report.frames[0],
            functionName: 'PRIVATE_PROPERTY',
          },
        ],
      }),
    ).toBe(false);
    expect(
      isPrivacySafeErrorReport({
        ...report,
        frames: [
          {
            debugId: DEBUG_ID,
            filename: '/assets/PRIVATE_NOTE-abcdef12.js',
            lineNumber: 10,
            columnNumber: 20,
          },
        ],
      }),
    ).toBe(false);
  });
});
