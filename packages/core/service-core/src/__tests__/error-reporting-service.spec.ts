import {
  AUTOMATIC_ERROR_REPORTING_PREFERENCE_KEY,
  DATABASE_TABLE_NAME,
  SERVICE_NAME,
} from '@bangle.io/constants';
import { createTestEnvironment } from '@bangle.io/test-utils';
import type {
  ManualErrorReportHandler,
  PrivacySafeErrorReport,
} from '@bangle.io/types';
import { describe, expect, test, vi } from 'vitest';

function makeReport(id = 'fb3b15d4-c536-4bf5-8d06-f328247b9619') {
  const debugId = '4c346747-7b26-4ea3-9657-1f6776a4e8b2';
  return {
    schemaVersion: 2,
    id,
    capturedAt: '2026-07-19T12:00:00.000Z',
    errorType: 'TypeError',
    route: 'editor',
    release: 'bangle.io@1.2.3+abcdef12',
    environment: 'production',
    frames: [
      {
        debugId,
        filename: `/assets/bangle-${debugId}.js`,
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

  test('keeps the bootstrap fail-closed state when storage is invalid', async () => {
    const env = createTestEnvironment();
    vi.mocked(
      env.commonOpts.errorReporting.getAutomaticReportingEnabled,
    ).mockReturnValue(false);
    const services = env.instantiateAll('errorReporting');
    services.syncDatabase.updateEntry(
      `${SERVICE_NAME.errorReportingService}:${AUTOMATIC_ERROR_REPORTING_PREFERENCE_KEY}`,
      () => ({ value: 'invalid-preference' }),
      { tableName: 'sync' },
    );

    await env.mountAll();

    expect(
      env.store.get(services.errorReporting.$automaticReportingEnabled),
    ).toBe(false);
    expect(
      env.commonOpts.errorReporting.setAutomaticReportingEnabled,
    ).toHaveBeenLastCalledWith(false);
  });

  test('prompts with the exact persisted report when automatic sending is off', async () => {
    const { env, services, handler } = await setup();
    const report = makeReport();
    await services.errorReporting.setAutomaticReportingEnabled(false);

    await handler(report);

    expect(env.store.get(services.errorReporting.$manualReportPrompt)).toEqual(
      report,
    );
    services.errorReporting.dismissManualReportPrompt(report.id);
    expect(
      env.store.get(services.errorReporting.$manualReportPrompt),
    ).toBeUndefined();
    expect(
      await services.database.getAllEntries({
        tableName: DATABASE_TABLE_NAME.misc,
      }),
    ).toEqual([report]);
  });

  test('sends and deletes one approved report from the prompt', async () => {
    const { env, services, handler } = await setup();
    const report = makeReport();
    await services.errorReporting.setAutomaticReportingEnabled(false);
    await handler(report);
    vi.mocked(env.commonOpts.errorReporting.sendReports).mockResolvedValueOnce({
      sentReportIds: [report.id],
    });

    await expect(
      services.errorReporting.sendPendingReport(report.id),
    ).resolves.toBe(true);

    expect(env.commonOpts.errorReporting.sendReports).toHaveBeenCalledWith([
      report,
    ]);
    expect(
      env.store.get(services.errorReporting.$manualReportPrompt),
    ).toBeUndefined();
    expect(env.store.get(services.errorReporting.$pendingReportCount)).toBe(0);
  });

  test('offers each report for review when several errors arrive together', async () => {
    const { env, services, handler } = await setup();
    const first = makeReport();
    const second = makeReport('ce52fe73-c36c-4f43-b62f-99949acb9c24');
    await services.errorReporting.setAutomaticReportingEnabled(false);

    await handler(first);
    await handler(second);

    expect(env.store.get(services.errorReporting.$manualReportPrompt)).toEqual(
      first,
    );
    services.errorReporting.dismissManualReportPrompt(first.id);
    expect(env.store.get(services.errorReporting.$manualReportPrompt)).toEqual(
      second,
    );
    services.errorReporting.dismissManualReportPrompt(second.id);
    expect(
      env.store.get(services.errorReporting.$manualReportPrompt),
    ).toBeUndefined();
  });

  test('keeps at most 50 local reports', async () => {
    const { env, services, handler } = await setup();
    await services.errorReporting.setAutomaticReportingEnabled(false);

    await Promise.all(
      Array.from({ length: 55 }, () =>
        handler(makeReport(crypto.randomUUID())),
      ),
    );

    expect(env.store.get(services.errorReporting.$pendingReportCount)).toBe(50);
    const persisted = await services.database.getAllEntries({
      tableName: DATABASE_TABLE_NAME.misc,
    });
    expect(persisted).toHaveLength(50);
    expect(persisted).toContainEqual(
      env.store.get(services.errorReporting.$manualReportPrompt),
    );
  });
});
