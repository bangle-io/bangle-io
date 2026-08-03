# Triage and Synchronization Policy

## Evidence order

Use the strongest available evidence:

1. Explicit maintainer direction in the current request.
2. Merged or open pull request state and its actual diff.
3. Current repository code and tests.
4. Active plan frontmatter, progress notes, and acceptance criteria.
5. Repository issue state and discussion.
6. Existing project-item fields and prose.

Do not treat an open PR as proof that the whole initiative is complete. Do not treat a closed issue as proof that code shipped. Check the outcome.

## Duplicate detection

Before creating an item, compare:

- referenced plan path or plan number;
- issue or PR URLs and numbers;
- the concrete user-visible or architectural outcome;
- distinctive nouns from the requested change;
- parent/follow-up relationships.

Update the canonical item when the outcomes overlap. Create a separate item only for independently schedulable work with its own definition of done. When an issue or PR represents part of a larger initiative, link it from the initiative draft.

## Fields

Resolve live field names and option values with the helper. The semantic rules are:

### Status

- `New`: captured but not sufficiently investigated or scoped. Use sparingly; ask the missing product or correctness question in the body.
- `Backlog`: scoped enough to prioritize and pick up, but implementation has not started.
- `In progress`: active implementation or an open PR owns the work. State the PR readiness and next action.
- `Done`: delivered or intentionally closed. Record the merged PR or explicit decision.
- `icebox`: intentionally deferred. State what must change before promotion.

### Priority

- `Urgent` (`P0`): active data loss/security risk, production outage, broken release, or inability to open/edit/save/recover notes.
- `High` (`P1`): serious correctness regression, blocked release, important active initiative, or durable-data risk that is not an active outage.
- `Medium` (`P2`): normal product work, meaningful polish, maintainability, and planned follow-ups.
- `Low` (`P3`): speculative, low-impact, optional, or deliberately distant work.

Compare against neighboring project items before finalizing priority. Priority is relative; do not label every user request High.

### Size

Estimate the remaining initiative, not the next commit:

- `Tiny`: one-line, configuration, or documentation-only change.
- `Small`: localized behavior and focused tests.
- `Medium`: multi-file work, meaningful tests, or moderate design decisions.
- `Large`: cross-package or user-workflow change.
- `X-Large`: broad architecture, migration, multi-stage initiative, or release-sized work.

Inspect the owning package before estimating. Ask when the difference would change scheduling or split strategy.

### Product area

- `Editor`: editing, ProseMirror, Markdown, slash commands, tables, embeds, selection, and editor UX.
- `Workspaces & storage`: IndexedDB, Native FS, files, persistence, sync, recovery, workspace lifecycle.
- `Navigation & organization`: routes, file tree, note discovery, rename/move UX, hierarchy.
- `Onboarding & delight`: first-run experience, examples, discoverability, friendly polish.
- `Platform & quality`: build, release, Electron/platform infrastructure, testing, observability, performance, and cross-cutting architecture.

Choose the area that owns the outcome, not every package the implementation touches.

### Iteration (`w`)

- Treat the `w` field as the scheduling source of truth. The `Sprints` view includes all non-Done, non-icebox work and does not by itself mean an item is sprint-committed.
- Assign `current` only for work explicitly committed to the current sprint or already in progress.
- Assign `next` only with an explicit scheduling decision.
- Priority does not imply sprint assignment.
- Clear an iteration when work is deliberately unscheduled, not merely delayed by a day.

## Clarification threshold

Proceed without a question when repository evidence supports one reasonable title, scope, canonical item, and classification. Ask a concise question when any of these would materially change the result:

- two existing items could both be canonical;
- the request combines outcomes that should probably be split;
- priority or iteration would create a real commitment unsupported by evidence;
- acceptance criteria involve a product choice that code cannot answer;
- a broad sync would close, defer, reprioritize, or reschedule multiple items.

Capture incomplete ideas as `New` only when the user asked to record them despite unresolved scope. Put the unresolved decision and next step in the body.

## Draft body formats

### New or backlog work

```markdown
## Context
What prompted the item, relevant code paths, and related plan/issue/PR links.

## Current behavior
What the repository does now, based on inspection.

## Goal
The desired user-visible or architectural outcome.

## Acceptance criteria
- Observable result.
- Data-safety, Markdown-fidelity, or failure behavior where relevant.
- Required unit and Playwright coverage where relevant.

## Next decision
Only include when a real unresolved choice blocks pickup.
```

### Active work

Add:

```markdown
## Progress
Owning PR/branch, readiness, what is complete, and what remains.

## Next action
The next concrete action needed to advance or merge it.
```

### Completed or deferred work

Add one of:

```markdown
## Completion
Merged PR or explicit decision, date, and delivered outcome.
```

```markdown
## Triage
Why this is deferred and the condition for reconsidering it.
```

Keep bodies concise but durable. Use repository-relative paths in prose and full GitHub links for cross-references.
