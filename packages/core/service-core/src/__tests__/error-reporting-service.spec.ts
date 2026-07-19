import { DATABASE_TABLE_NAME } from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import type {
  ManualErrorReportHandler,
  PrivacySafeErrorReport,
} from '@bangle.io/types';
import { describe, expect, test, vi } from 'vitest';

function makeReport(id = 'fb3b15d4-c536-4bf5-8d06-f328247b9619') {
  return {
    schemaVersion: 1,
    id,
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
  } satisfies PrivacySafeErrorReport;
}

async function setup() {
  const env = createTestEnvironment();
  const services = env.instantiateAll('errorReporting');
  await env.mountAll();
  const handler = vi
    .mocked(env.commonOpts.errorReporting.setManualReportHandler)
    .mock.calls.find(
      ([candidate]) => candidate,
    )?.[0] as ManualErrorReportHandler;

  return { env, services, handler };
}

describe('ErrorReportingService', () => {
  test('persists only validated privacy-safe reports in the database', async () => {
    const { env, services, handler } = await setup();

    await handler(makeReport());

    const values = await services.database.getAllEntries({
      tableName: DATABASE_TABLE_NAME.misc,
    });
    expect(values).toEqual([makeReport()]);
    expect(JSON.stringify(values)).not.toContain('PRIVATE_NOTE.md');
    expect(env.store.get(services.errorReporting.$pendingReportCount)).toBe(1);
  });

  test('deletes reports only after the manual transport confirms success', async () => {
    const { env, services, handler } = await setup();
    const report = makeReport();
    await handler(report);

    vi.mocked(env.commonOpts.errorReporting.sendReports).mockResolvedValueOnce({
      sentReportIds: [],
    });
    await expect(services.errorReporting.sendPendingReports()).resolves.toEqual(
      { sent: 0, remaining: 1 },
    );

    vi.mocked(env.commonOpts.errorReporting.sendReports).mockResolvedValueOnce({
      sentReportIds: [report.id],
    });
    await expect(services.errorReporting.sendPendingReports()).resolves.toEqual(
      { sent: 1, remaining: 0 },
    );
  });

  test('persists the opt-out preference and updates capture immediately', async () => {
    const { env, services } = await setup();

    await services.errorReporting.setAutomaticReportingEnabled(false);

    expect(
      env.store.get(services.errorReporting.$automaticReportingEnabled),
    ).toBe(false);
    expect(
      env.commonOpts.errorReporting.setAutomaticReportingEnabled,
    ).toHaveBeenLastCalledWith(false);
  });

  test('keeps at most 50 local reports', async () => {
    const { env, services, handler } = await setup();

    for (let index = 0; index < 55; index += 1) {
      await handler(makeReport(crypto.randomUUID()));
    }

    expect(env.store.get(services.errorReporting.$pendingReportCount)).toBe(50);
    expect(
      await services.database.getAllEntries({
        tableName: DATABASE_TABLE_NAME.misc,
      }),
    ).toHaveLength(50);
  });
});
