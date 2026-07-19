/**
 * @vitest-environment happy-dom
 */

import type { PrivacySafeErrorReport } from '@bangle.io/initialize-services';
import { Logger } from '@bangle.io/logger';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  initializeSentry,
  readAutomaticErrorReportingPreference,
  serializeSentryEnvelope,
} from '../setup-sentry';

const PRIVATE_MARKERS = [
  'SECRET_NOTE_CONTENT',
  'PRIVATE_WORKSPACE',
  'PRIVATE_NOTE.md',
  'PRIVATE_CAUSE',
  'PRIVATE_PROPERTY',
];

function makePrivateError(): Error {
  const error = new TypeError('SECRET_NOTE_CONTENT', {
    cause: new Error('PRIVATE_CAUSE'),
  });
  Object.assign(error, {
    wsPath: 'PRIVATE_WORKSPACE:PRIVATE_NOTE.md',
    privateProperty: 'PRIVATE_PROPERTY',
  });
  error.stack =
    'TypeError: SECRET_NOTE_CONTENT\n    at save (https://app.bangle.io/assets/index-abcdef12.js?wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md:10:20)';
  return error;
}

function expectNoPrivateMarkers(value: unknown): void {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const marker of PRIVATE_MARKERS) {
    expect(serialized).not.toContain(marker);
  }
}

describe('privacy-safe Sentry transport', () => {
  beforeEach(() => {
    window.history.replaceState(
      null,
      '',
      '/#route=editor&wsPath=PRIVATE_WORKSPACE:PRIVATE_NOTE.md',
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true } satisfies Pick<Response, 'ok'>),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('sends only a reconstructed allowlisted envelope in automatic mode', async () => {
    const controller = initializeSentry(new Logger('', 'debug'), true);
    const error = makePrivateError();

    controller.captureException(error);
    controller.captureException(error);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const request = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = request?.body;
    expect(typeof body).toBe('string');
    expect(body).toContain('Bangle application error');
    expect(body).toContain('"route":"editor"');
    expectNoPrivateMarkers(body);
    expect(request?.credentials).toBe('omit');
    expect(request?.referrerPolicy).toBe('no-referrer');
  });

  test('stores a sanitized report without making a request when disabled', async () => {
    const controller = initializeSentry(new Logger('', 'debug'), false);
    const persist = vi.fn().mockResolvedValue(undefined);

    controller.captureException(makePrivateError());
    controller.setManualReportHandler(persist);

    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(fetch).not.toHaveBeenCalled();
    const report = persist.mock.calls[0]?.[0];
    expect(report.route).toBe('editor');
    expectNoPrivateMarkers(report);
  });

  test('aborts an automatic request when reporting is disabled', async () => {
    let requestSignal: AbortSignal | null | undefined;
    vi.mocked(fetch).mockImplementationOnce((_input, init) => {
      requestSignal = init?.signal;
      return new Promise(() => {});
    });
    const controller = initializeSentry(new Logger('', 'debug'), true);

    controller.captureException(makePrivateError());
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await controller.setAutomaticReportingEnabled(false);

    expect(requestSignal?.aborted).toBe(true);
  });

  test('bounds reports captured before IndexedDB is ready', async () => {
    const controller = initializeSentry(new Logger('', 'debug'), false);
    for (let index = 0; index < 55; index += 1) {
      controller.captureException(makePrivateError());
    }
    const persist = vi.fn().mockResolvedValue(undefined);

    controller.setManualReportHandler(persist);

    await vi.waitFor(() => expect(persist).toHaveBeenCalledTimes(50));
  });

  test('manual envelopes do not gain fields from the original error', () => {
    const report: PrivacySafeErrorReport = {
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
    };

    const envelope = serializeSentryEnvelope(report, 'manual');
    expect(envelope).toContain('"reporting_mode":"manual"');
    expectNoPrivateMarkers(envelope);
  });

  test('defaults on and honors only an explicit stored false preference', () => {
    const getItem = vi.fn();
    expect(readAutomaticErrorReportingPreference('key', { getItem })).toBe(
      true,
    );

    getItem.mockReturnValueOnce('false');
    expect(readAutomaticErrorReportingPreference('key', { getItem })).toBe(
      false,
    );

    getItem.mockReturnValueOnce('invalid-json');
    expect(readAutomaticErrorReportingPreference('key', { getItem })).toBe(
      true,
    );
  });
});
