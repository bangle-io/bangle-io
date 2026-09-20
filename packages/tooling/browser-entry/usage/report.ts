import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const mode = process.argv.includes('--local') ? '--local' : '--remote';
const config = fileURLToPath(new URL('./wrangler.jsonc', import.meta.url));
const queries = readFileSync(new URL('./report.sql', import.meta.url), 'utf8')
  .split(';')
  .filter((sql) => sql.trim());
const labels = [
  'Active installations (UTC)',
  'Daily activity',
  'Exact-day retention',
];

// D1 execute with a multi-statement file returns only the final SELECT locally.
// Execute each report separately so all three tables are visible on every target.
for (const [index, query] of queries.entries()) {
  const output = execFileSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      'USAGE_DB',
      mode,
      '--config',
      config,
      `--command=${query}`,
      '--json',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
  const batches: unknown = JSON.parse(output);
  if (!Array.isArray(batches)) throw new Error('Unexpected D1 report response');
  console.log(`\n${labels[index] ?? 'Usage report'}`);
  for (const batch of batches) {
    if (
      typeof batch !== 'object' ||
      batch === null ||
      !('results' in batch) ||
      !Array.isArray(batch.results)
    ) {
      throw new Error('Unexpected D1 report rows');
    }
    console.table(batch.results);
  }
}
