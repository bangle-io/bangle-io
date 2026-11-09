import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import worker from '../worker';

type Environment = Parameters<typeof worker.fetch>[1];
const databases: DatabaseSync[] = [];
const schema = readFileSync(
  new URL('../../migrations/0001_usage.sql', import.meta.url),
  'utf8',
);
const report = readFileSync(
  new URL('../../report.sql', import.meta.url),
  'utf8',
);
const ID = '550e8400-e29b-41d4-a716-446655440000';
function setup() {
  const db = new DatabaseSync(':memory:');
  databases.push(db);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema);
  function prepare(
    sql: string,
    values: (string | number)[] = [],
  ): ReturnType<Environment['USAGE_DB']['prepare']> {
    return {
      bind: (...bound) => prepare(sql, bound),
      run: async () => db.prepare(sql).run(...values),
    };
  }
  const env: Environment = {
    USAGE_DB: {
      prepare,
      batch: async (statements) => {
        db.exec('BEGIN');
        try {
          for (const statement of statements) await statement.run();
          db.exec('COMMIT');
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      },
    },
    USAGE_RATE_LIMITER: { limit: async () => ({ success: true }) },
  };
  return { db, env };
}
function payload() {
  return {
    version: 1,
    installationId: ID,
    day: new Date().toISOString().slice(0, 10),
    read: true,
    edited: false,
  };
}
function request(body: unknown = payload(), headers?: Record<string, string>) {
  return new Request('https://app.bangle.io/api/usage', {
    method: 'POST',
    headers: {
      Origin: 'https://app.bangle.io',
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

describe('usage collection', () => {
  it('deduplicates retries and merges out-of-order daily flags in real SQLite', async () => {
    const { db, env } = setup();
    for (const summary of [
      payload(),
      { ...payload(), read: false, edited: true },
      payload(),
    ]) {
      expect((await worker.fetch(request(summary), env)).status).toBe(204);
    }
    expect(db.prepare('SELECT * FROM usage_days').all()).toEqual([
      { installation_id: ID, day: payload().day, read: 1, edited: 1 },
    ]);
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    await worker.fetch(request({ ...payload(), day: yesterday }), env);
    expect(
      db.prepare('SELECT first_day, last_day FROM usage_installations').get(),
    ).toEqual({ first_day: yesterday, last_day: payload().day });
  });

  it.each([
    { ...payload(), filename: 'private-note.md' },
    { ...payload(), installationId: 'not-a-random-id' },
    { ...payload(), day: '2026-02-30' },
    { ...payload(), day: '2999-01-01' },
    { ...payload(), day: '2020-01-01' },
    { ...payload(), read: false, edited: false },
    { ...payload(), read: 'true' },
    { ...payload(), version: 2 },
  ])(
    'rejects invalid or excessive fields without recording activity',
    async (summary) => {
      const { db, env } = setup();
      expect((await worker.fetch(request(summary), env)).status).toBe(400);
      expect(
        db.prepare('SELECT COUNT(*) AS n FROM usage_installations').get(),
      ).toEqual({ n: 0 });
    },
  );

  it('rejects other origins, bot traffic and oversized payloads; rate limits requests', async () => {
    const { db, env } = setup();
    expect(
      (
        await worker.fetch(
          request(payload(), { Origin: 'https://bangle.io' }),
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await worker.fetch(
          request(payload(), { 'User-Agent': 'Googlebot' }),
          env,
        )
      ).status,
    ).toBe(204);
    expect((await worker.fetch(request('x'.repeat(2048)), env)).status).toBe(
      400,
    );
    env.USAGE_RATE_LIMITER.limit = async () => ({ success: false });
    expect((await worker.fetch(request(), env)).status).toBe(429);
    expect(db.prepare('SELECT COUNT(*) AS n FROM usage_days').get()).toEqual({
      n: 0,
    });
  });

  it('reports retryable database failures without acknowledging or leaving a partial installation', async () => {
    const { db, env } = setup();
    db.exec('DROP TABLE usage_days');
    expect((await worker.fetch(request(), env)).status).toBe(503);
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM usage_installations').get(),
    ).toEqual({ n: 0 });
  });

  it('expires inactive installations and old days while retaining the first day of active installations', async () => {
    const { db, env } = setup();
    db.exec(`INSERT INTO usage_installations VALUES ('inactive', date('now', '-100 days'), date('now', '-100 days')), ('active', date('now', '-100 days'), date('now'));
      INSERT INTO usage_days VALUES ('inactive', date('now', '-100 days'), 1, 0), ('active', date('now'), 0, 1);`);
    await worker.scheduled({}, env);
    expect(db.prepare('SELECT id FROM usage_installations').all()).toEqual([
      { id: 'active' },
    ]);
    expect(db.prepare('SELECT COUNT(*) AS n FROM usage_days').get()).toEqual({
      n: 1,
    });
  });

  it('reports distinct active/returning installations and only mature retention cohorts', () => {
    const { db } = setup();
    db.exec(`INSERT INTO usage_installations VALUES
      ('a', '2026-08-01', '2026-09-19'), ('b', '2026-09-18', '2026-09-19'), ('c', '2026-09-19', '2026-09-19');
      INSERT INTO usage_days VALUES
      ('a', '2026-08-01', 1, 0), ('a', '2026-08-08', 1, 0), ('a', '2026-08-31', 0, 1), ('a', '2026-09-19', 0, 1),
      ('b', '2026-09-18', 1, 0), ('b', '2026-09-19', 1, 0), ('c', '2026-09-19', 0, 1);`);
    const queries = report
      .replaceAll("'now'", "'2026-09-19'")
      .split(';')
      .filter((sql) => sql.trim());
    const results = queries.map((sql) => db.prepare(sql).all());
    expect(results[0]).toEqual([
      {
        period: 'daily',
        active_installations: 3,
        readers: 1,
        editors: 2,
        returning_installations: 2,
      },
      {
        period: 'weekly',
        active_installations: 3,
        readers: 1,
        editors: 2,
        returning_installations: 2,
      },
      {
        period: 'monthly',
        active_installations: 3,
        readers: 1,
        editors: 2,
        returning_installations: 2,
      },
    ]);
    expect(results[2]).toEqual([
      {
        retention_day: 7,
        eligible_installations: 1,
        retained_installations: 1,
        retention_percent: 100,
      },
      {
        retention_day: 30,
        eligible_installations: 1,
        retained_installations: 1,
        retention_percent: 100,
      },
    ]);
  });
});
