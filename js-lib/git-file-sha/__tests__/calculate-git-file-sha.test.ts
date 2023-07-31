import { calculateGitFileSha } from '@bangle.io/git-file-sha';

import { readFileBlob } from './test-helpers';

test('hashed file-a', async () => {
  const blob = await readFileBlob('file-a.json');

  const sha = await calculateGitFileSha(blob);

  expect(sha).toBe('7ad72a87fbfb1d2abd96330d4815c29b8a09ece7');
});

test('hashes file-b', async () => {
  const blob = await readFileBlob('file-b.md');

  const sha = await calculateGitFileSha(blob);

  expect(sha).toBe('d7fc7b493f69db5cf1900630cd991f1dbc792af5');
});

test('hashes file-c', async () => {
  const blob = await readFileBlob('file-c.svg');

  const sha = await calculateGitFileSha(blob);

  expect(sha).toBe('dbf2f821944ee7a7d354911beb5a73128450e25e');
});

test('hashes file-d', async () => {
  const blob = await readFileBlob('file-d.png');

  const sha = await calculateGitFileSha(blob);

  expect(sha).toBe('a889f703930cf8795915ef7eefdbbe7cb7af7046');
});
