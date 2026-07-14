---
name: bangle-followup-operator
description: Operate recurring Bangle.io agent follow-ups after a thread has already started. Use when the user asks to continue, check status, decide what is next, push, create or update a PR, poll CI, rebase, merge, release, run Playwright/manual UX checks, spawn or aggregate code-review subagents, run thermonuclear review, address review findings, make a plan, add a project task, or asks "we good?", "pushed?", "PR?", "did you test?", "what should I test?", or similar follow-up prompts in the Bangle repo.
---

# Bangle Follow-up Operator

## Overview

Use this skill to convert short Bangle follow-ups into the next concrete action. Keep repository-wide engineering policy in `AGENTS.md`/`CLAUDE.md`; keep plan-specific policy in `plans/AGENTS.md`.

## Reconstruct State

1. Read the latest prompt and recent conversation turns using the thread/history tools available in the current agent environment.
2. Check repository state from the root: branch, dirty files, remotes, active PR, recent commits, and any generated worktree context.
3. Infer terse prompts like `continue`, `what next`, `we good`, `pushed?`, or `PR?` from the immediately previous work before asking for clarification.

## Route the Follow-up

### Continue or status

- Inspect unfinished commands, partial edits, unpushed commits, failed checks, and PR/CI state.
- Report exact current state, then continue the next unfinished step.

### Review or subagent request

- For `thermonuclear review`, use the `thermonuclear-code-quality-review` skill.
- For normal review or subagent review, pass raw scope: repo path, branch/PR, diff target, constraints, and whether the agent may edit.
- Aggregate findings into `must fix`, `worth fixing`, and `defer/track`.

### Address findings or "do it"

- Re-read the cited code and tests before editing.
- Implement only fixes that match the user's scope and improve the branch.
- Prefer changes that reduce total uncertainty and complexity. Type and lint
  cleanup has strong ROI when it clarifies a real boundary, improves useful
  caller inference, or makes an invalid state unrepresentable. Reconsider it
  when satisfying the rule adds conditional type machinery, assertions, or
  downstream churn without a concrete new guarantee. Type-level wildcards and
  runtime boundary leaks can look similar in a scan but have different risk;
  judge the resulting API and implementation, not the warning count alone.
- After edits, run focused checks first, then the required `AGENTS.md` gates for the changed surface.

### UI, UX, or Playwright follow-up

- Use `playwright-cli`, browser, or Chrome tools when the user asks for manual UX validation, screenshots, authenticated Chrome, or visual comparison.
- If the user points at production, t3code, prosekit, or another local reference, inspect that reference before claiming parity.

### PR, git, CI, and deploy follow-up

- Before push/PR/merge/release, verify branch, remote, dirty state, and target PR.
- After push, provide the PR URL or branch and poll relevant GitHub checks when requested.
- For Cloudflare preview or GitHub Action comments, verify whether displayed commit hashes are PR head SHAs, merge SHAs, or deployment branch SHAs before patching.
- For releases, use the applicable Bangle release skill and `AGENTS.md` release gates.

### Planning or project task

- For durable plans under `plans/`, read `plans/AGENTS.md` first.
- For "add a task", "track this", or Bangle project board requests, use `bangle-project-task`.
- When a plan is fully done, move it to `plans/archived/`, set `status: completed`, set `archived: true`, set `archived_on: YYYY-MM-DD` in the YAML frontmatter, update `updated`, and include the DONE note required by `plans/AGENTS.md`.

## Close Out

- State what changed or what was found.
- Include branch/PR/push/CI status when relevant.
- Include checks run and any checks intentionally not run.
