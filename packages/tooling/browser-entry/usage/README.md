# App usage

The production app sends daily activity summaries to `/api/usage`. A separate
Cloudflare Worker handles that exact route; Pages continues serving the app.
This replaces the app's GoatCounter route tracking. Cloudflare Web Analytics
remains useful for traffic, and Sentry remains useful for reliability.

Measurement is enabled by default. Settings → General → Share basic usage
turns it off for this browser, including other open tabs. Use that setting in
your own browser to exclude development/manual testing on production.

## What the numbers mean

- **Active installation:** a random ID stored in this browser, with either
  qualifying reading or a successful editor save on the indicated UTC day.
- **Reading:** 30 seconds with a note visible in the foreground and a trusted
  interaction within the last minute. Landing pages and idle tabs do not count.
- **Editing:** a successful editor write after a recent user interaction.
  Opening notes, creating tutorial content, and applying external file changes
  do not emit this signal. Failed writes are counted only if a retry succeeds.
- **Returning:** an active installation whose first observed activity was on an
  earlier UTC day. Returning counts are deduplicated across each report window.
- **D7/D30 retention:** activity exactly 7 or 30 days after first observed
  activity. Only cohorts whose follow-up day has finished enter the denominator.

These are observed browser installations, not verified people or accounts.
Different devices, storage resets and private browsing can split one person;
shared browsers can combine people. Blocking requests or using the app offline
for more than seven days can undercount. Activity checks and basic bot filtering
reduce automated traffic but cannot establish that a human is present. First
observed activity starts with this instrumentation, including existing users.

## Data and delivery

The body contains only `version`, `installationId`, `day`, `read`, and `edited`.
The Worker rejects additional fields. There are no note contents, titles, paths,
workspace names, email addresses or stored IP addresses. The random identifier
links activity across days; it is pseudonymous. IP is used transiently by
Cloudflare's rate limiter (60 requests per minute per IP). Worker request
logging is disabled. Cloudflare still processes the underlying network traffic.

The client merges daily flags locally and queues at most seven UTC days. It
retries delivery with backoff; only HTTP 204 acknowledges a summary. The D1
primary key makes retries and multiple tabs idempotent. Measurement errors
never block startup, editing or note persistence. Opting out discards queued
summaries and stops future collection; it does not delete previous aggregates
or affect error reporting. No IDs are added to Sentry.

The daily scheduled handler retains 90 days of individual activity and removes
installations inactive for 90 days. For installations still active, first/last
observed dates remain available to distinguish returning use. There is no public
read endpoint, and reports require the maintainer's Cloudflare credentials.

## Rollout

Run from the repository root with the intended Cloudflare account selected:

```sh
pnpm cf:whoami
pnpm usage:deploy
pnpm usage:migrate
```

Wrangler automatically provisions the `USAGE_DB` D1 binding on first deployment
and writes its ID into `usage/wrangler.jsonc`. Keep that ID for subsequent
migrations and reporting. `usage:deploy` creates the narrow Worker route and
retention schedule. Until migrations finish the endpoint returns 503, which the
client retries. Complete both steps **before releasing the new app build** via
the normal production release workflow. The Pages Wrangler configuration does
not change. This PR alone does not provision or deploy these resources.

The token needs Worker deployment, D1 and zone Worker-route permissions.
The production hostname must remain proxied through Cloudflare.

## Reporting

```sh
pnpm usage:report
```

This runs `report.sql` against remote D1 and prints three tables: daily/weekly/
monthly active installations, daily activity for the last 30 days, and mature
D7/D30 retention. Rolling windows include today, which may be incomplete. A
null retention percentage means no eligible cohort yet, not zero retention.
Reports cover observed activity; they do not extrapolate missing users or
reconstruct historical activity from old pageview/session counters.

## Local checks

```sh
pnpm usage:migrate:local
pnpm usage:report --local
pnpm usage:dev
```

These commands use a local D1 database. The Worker still requires the production
Origin header when testing requests. `wrangler deploy --dry-run --config
packages/tooling/browser-entry/usage/wrangler.jsonc` validates the Worker bundle
without deployment. The unit tests exercise the schema and report SQL using
real SQLite, including duplicate delivery, failures and retention cleanup.

Playwright enables collection only with `BANGLE_USAGE_TESTING=1` at build/dev
startup, a localhost URL, and `?usageTest=true`. Tests intercept `/api/usage`;
normal previews, local builds and desktop builds do not send production data.
