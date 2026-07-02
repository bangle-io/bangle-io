const marker = '<!-- bangle-cloudflare-pr-preview -->';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function renderCommitLine({ sha, state }) {
  const shortSha = sha.slice(0, 7);

  if (state === 'building') {
    return `Commit: \`${shortSha}\` (building \`${shortSha}\` commit)`;
  }

  return `Commit: \`${shortSha}\``;
}

module.exports = async function updateCloudflarePreviewComment({
  github,
  context,
}) {
  const pr = context.payload.pull_request;
  if (!pr) {
    throw new Error('Cloudflare preview comments require a pull_request event.');
  }

  const previewUrl = requireEnv('PREVIEW_URL');
  const previewBranch = requireEnv('PREVIEW_BRANCH');
  const previewSha = requireEnv('PREVIEW_SHA');
  const previewState = process.env.PREVIEW_STATE || 'deployed';
  const runAt = new Date().toISOString();

  const body = [
    marker,
    '## Cloudflare Pages Preview',
    '',
    `Preview: ${previewUrl}`,
    '',
    `Branch: \`${previewBranch}\``,
    renderCommitLine({ sha: previewSha, state: previewState }),
    `Last run: \`${runAt}\``,
    '',
    'This comment is updated automatically when new commits are pushed to this PR.',
  ].join('\n');

  const { owner, repo } = context.repo;
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  });

  const existing = comments.find((comment) => comment.body?.includes(marker));

  if (existing) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
    return;
  }

  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: pr.number,
    body,
  });
};
