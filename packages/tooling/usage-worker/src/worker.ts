// Only the D1 and rate-limiter operations used by this Worker are required.
interface Statement {
  bind(...values: (string | number)[]): Statement;
  run(): Promise<unknown>;
}
interface Environment {
  USAGE_DB: {
    prepare(sql: string): Statement;
    batch(statements: Statement[]): Promise<unknown>;
  };
  USAGE_RATE_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

const ORIGIN = 'https://app.bangle.io';
const DAY_MS = 86_400_000;
const MAX_BODY_BYTES = 1024;
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = new Set(['version', 'installationId', 'day', 'read', 'edited']);

type Summary = {
  version: 1;
  installationId: string;
  day: string;
  read: boolean;
  edited: boolean;
};

function isSummary(value: unknown): value is Summary {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  if (Object.keys(value).some((key) => !FIELDS.has(key))) return false;
  if (
    !('version' in value) ||
    value.version !== 1 ||
    !('installationId' in value) ||
    typeof value.installationId !== 'string' ||
    !UUID.test(value.installationId) ||
    !('day' in value) ||
    typeof value.day !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.day) ||
    !('read' in value) ||
    typeof value.read !== 'boolean' ||
    !('edited' in value) ||
    typeof value.edited !== 'boolean' ||
    (!value.read && !value.edited)
  )
    return false;
  const date = new Date(`${value.day}T00:00:00Z`);
  const oldest = new Date(Date.now() - 6 * DAY_MS).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value.day &&
    value.day >= oldest &&
    value.day <= today
  );
}

async function readBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  let text = '';
  let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

function response(status: number): Response {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    if (new URL(request.url).pathname !== '/api/usage') return response(404);
    if (request.method !== 'POST') return response(405);
    if (request.headers.get('Origin') !== ORIGIN) return response(403);
    if (
      !request.headers
        .get('Content-Type')
        ?.toLowerCase()
        .startsWith('application/json')
    )
      return response(415);
    if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES)
      return response(413);
    if (
      /bot|spider|crawler|HeadlessChrome/i.test(
        request.headers.get('User-Agent') ?? '',
      )
    )
      return response(204);
    try {
      // IP is used transiently for abuse throttling, never written to D1.
      const { success } = await env.USAGE_RATE_LIMITER.limit({
        key: request.headers.get('CF-Connecting-IP') ?? 'unknown',
      });
      if (!success) return response(429);
      let summary: unknown;
      try {
        summary = await readBody(request);
      } catch {
        return response(400);
      }
      if (!isSummary(summary)) return response(400);
      // The batch is atomic; retries and simultaneous tabs cannot inflate counts.
      await env.USAGE_DB.batch([
        env.USAGE_DB.prepare(`
          INSERT INTO usage_installations (id, first_day, last_day) VALUES (?, ?, ?)
          ON CONFLICT (id) DO UPDATE SET
            first_day = MIN(first_day, excluded.first_day),
            last_day = MAX(last_day, excluded.last_day)
        `).bind(summary.installationId, summary.day, summary.day),
        env.USAGE_DB.prepare(`
          INSERT INTO usage_days (installation_id, day, read, edited) VALUES (?, ?, ?, ?)
          ON CONFLICT (installation_id, day) DO UPDATE SET
            read = MAX(read, excluded.read), edited = MAX(edited, excluded.edited)
        `).bind(
          summary.installationId,
          summary.day,
          Number(summary.read),
          Number(summary.edited),
        ),
      ]);
      return response(204);
    } catch {
      return response(503);
    }
  },

  async scheduled(_event: unknown, env: Environment): Promise<void> {
    await env.USAGE_DB.batch([
      env.USAGE_DB.prepare(
        "DELETE FROM usage_days WHERE day < date('now', '-89 days')",
      ),
      env.USAGE_DB.prepare(
        "DELETE FROM usage_installations WHERE last_day < date('now', '-89 days')",
      ),
    ]);
  },
};
