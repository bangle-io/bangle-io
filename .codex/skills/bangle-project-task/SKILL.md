---
name: bangle-project-task
description: Add tasks, backlog items, bugs, chores, ideas, follow-ups, or draft issues to the Bangle 2 GitHub Projects board. Use when the user says "add a task", "put this on the board", "make a project task", "track this", "add a backlog item", or asks Codex to create a draft task in the bangle-io GitHub project.
---

# Bangle Project Task

Create GitHub Projects draft issues in the org project:

- Org: `bangle-io`
- Project: `Bangle 2`
- Project number: `5`
- Default view URL: `https://github.com/orgs/bangle-io/projects/5/views/4`

Use the GitHub CLI and GraphQL API. Do not create a repository issue unless the user explicitly asks for a real issue; default to a Projects v2 draft issue.

## Quick Start

1. Convert the user's request into a concise task title and a body with enough context for a future agent.
2. Classify `status`, `priority`, and `size` using the rules below.
3. Run:

```bash
python3 .codex/skills/bangle-project-task/scripts/add_bangle_project_task.py \
  --title "Task title" \
  --body "Task body" \
  --status Backlog \
  --priority P2 \
  --size S
```

If `gh` reports missing project scopes, run `gh auth refresh -h github.com -s project` and ask the user to complete the browser/device flow.

## Classification

Default field values:

- `Status`: `Backlog`
- `Priority`: omit unless there is enough signal
- `Size`: omit unless there is enough signal

Status:

- Use `Backlog` for normal tasks, ideas, bugs, chores, follow-ups, and upstream work.
- Use `Ready` only when the task is already clearly scoped and the user implies it should be picked up soon.
- Use `In progress` only when the user explicitly says work has started or should start now.
- Use `In review` only for review/PR tasks already awaiting review.
- Use `Done` only when the user explicitly asks to record completed work.

Priority:

- Use `P0` for data loss, security, production outage, broken release, or inability to open/edit/save notes.
- Use `P1` for important user-visible regressions, serious correctness bugs, blocked release work, or high-confidence product priorities.
- Use `P2` for normal backlog tasks, polish, maintainability, upstream cleanup, and non-urgent follow-ups.
- Omit priority when the request is too vague and adding a priority would invent intent.

Size:

- Use `XS` for one-line/config/documentation tweaks.
- Use `S` for small, localized tasks or narrow upstream follow-ups.
- Use `M` for multi-file work, new tests, or moderate design decisions.
- Use `L` for cross-package or UI workflow changes.
- Use `XL` for broad architecture, migration, or release-sized work.
- Omit size when uncertain.

## Body Format

Prefer this shape:

```markdown
## Context
What prompted the task and any relevant repository paths, URLs, or prior decision.

## Goal
The desired end state.

## Acceptance criteria
- Specific observable outcomes.
- Tests or checks expected when relevant.
```

Keep bodies practical. Include exact links and paths when available. Avoid vague notes like "fix this" without context.

## Verification

After creating the task, read it back or trust the script output. Report:

- Title
- Project URL or view URL
- Status and any fields set

If the task cannot be created, report the exact failing command and error. Do not pretend the task was added.
