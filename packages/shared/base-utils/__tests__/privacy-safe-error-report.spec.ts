import type { PrivacySafeErrorReport } from '@bangle.io/types';
import { describe, expect, test } from 'vitest';
import {
  createPrivacySafeErrorReport,
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
    '    at save (https://app.bangle.io/assets/index-SECRET_NOTE_CONTENT.js?wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md:10:20)',
    '    at extension (https://browser-extension.example/PRIVATE_NOTE.md:30:40)',
  ].join('\n');

  return createPrivacySafeErrorReport(error, {
    id: 'fb3b15d4-c536-4bf5-8d06-f328247b9619',
    capturedAt: '2026-07-19T12:00:00.000Z',
    route: 'editor',
    release: 'bangle.io@1.2.3+abcdef12',
    environment: 'production',
  });
}

describe('privacy-safe error reports', () => {
  test('reconstructs an allowlisted report without user-controlled error data', () => {
    const report = makeReport();
    const serialized = JSON.stringify(report);

    expect(report).toEqual({
      schemaVersion: 1,
      id: 'fb3b15d4-c536-4bf5-8d06-f328247b9619',
      capturedAt: '2026-07-19T12:00:00.000Z',
      errorType: 'TypeError',
      route: 'editor',
      release: 'bangle.io@1.2.3+abcdef12',
      environment: 'production',
      frames: [
        {
          filename: '/assets/index.js',
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

  test.each([
    'code-highlight-shiki',
    'core',
    'engine-javascript',
    'index',
  ])('drops the entire untrusted suffix for the %s bundle', (prefix) => {
    const frames = getPrivacySafeStackFrames(
      `Error: hidden\n at x (https://app.bangle.io/assets/${prefix}-SECRET_NOTE_CONTENT.js?wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md:7:9)`,
    );

    expect(frames).toEqual([
      { filename: `/assets/${prefix}.js`, lineNumber: 7, columnNumber: 9 },
    ]);
    expect(JSON.stringify(frames)).not.toContain('SECRET_NOTE_CONTENT');
    expect(JSON.stringify(frames)).not.toContain('PRIVATE_WORKSPACE');
    expect(JSON.stringify(frames)).not.toContain('PRIVATE_NOTE.md');
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
            filename: '/assets/PRIVATE_NOTE-abcdef12.js',
            lineNumber: 10,
            columnNumber: 20,
          },
        ],
      }),
    ).toBe(false);
  });
});
