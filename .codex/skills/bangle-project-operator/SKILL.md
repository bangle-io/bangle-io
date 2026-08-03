---
name: bangle-project-operator
description: Keep the Bangle 2 GitHub Project aligned with the bangle-io repository. Use for adding, finding, triaging, prioritizing, scheduling, editing, reconciling, or completing project items; assigning backlog, icebox, sprint, urgency, size, or product-area fields; relating plans, issues, pull requests, and code; auditing whether the board matches repository reality; or requests such as "add a task", "update the board", "triage this", "what should we work on", and "sync the project with the repo".
---

# Bangle Project Operator

Treat the Bangle 2 project as the canonical product and engineering backlog. Base every mutation on current board data and repository evidence rather than stale remembered field IDs or guesses.

## Scope

- Organization: `bangle-io`
- Repository: `bangle-io/bangle-io`
- Project: `Bangle 2` (`5`)
- Sprint view: `https://github.com/orgs/bangle-io/projects/5/views/8`
- Editor slice: `https://github.com/orgs/bangle-io/projects/5/views/8?sliceBy%5Bvalue%5D=%F0%9F%93%9D+Editor`

Use draft issues for canonical initiatives and work items. Add or edit repository issues only when the user explicitly requests public issue content. Link related issues and pull requests from the canonical draft instead of duplicating the same initiative.

## Operate

1. Read `AGENTS.md` and run from the repository root.
2. Inspect live project metadata and candidate items:

   ```bash
   python3 .codex/skills/bangle-project-operator/scripts/bangle_project.py inspect
   python3 .codex/skills/bangle-project-operator/scripts/bangle_project.py inspect --query 'product-area:"📝 Editor" -status:"✅ Done"'
   ```

3. Inspect relevant repository evidence before deciding what the board should say. Search owning packages, active plans, git history, linked issues, and open or merged pull requests. For a full synchronization, also inventory every unfinished `plans/*.md` file and every open PR.
4. Find the existing canonical item by plan number, issue/PR URL or number, exact title, and distinctive keywords. Prefer updating it. Do not create a near-duplicate because its title differs.
5. Decide the minimal mutation. Read [references/triage.md](references/triage.md) for field policy, evidence rules, clarification thresholds, and body formats.
6. Preview writes with `--dry-run`, inspect the resolved live option names and target item ID, then rerun without `--dry-run`. A direct user request to add or update one item authorizes that scoped mutation. Ask before a broad reconciliation that would change multiple items, archive anything, or materially alter product priority or sprint commitments.
7. Read the changed item back with `inspect --query`, then report its title, URL or item ID, fields, evidence, and any unresolved question.

## Create

Supply all active-item classification fields. Use `--iteration current` only when work is explicitly scheduled for or active in the current sprint.

```bash
python3 .codex/skills/bangle-project-operator/scripts/bangle_project.py create \
  --title "Concise outcome" \
  --body-file /tmp/bangle-project-body.md \
  --status backlog \
  --priority medium \
  --size small \
  --product-area editor \
  --dry-run
```

The helper discovers the live field IDs and options. It accepts semantic aliases such as `P0`, `urgent`, `in-progress`, `tiny`, `workspace`, `platform`, `current`, and `next`.

## Update

Resolve the exact project item ID with `inspect`; never select a write target by fuzzy title alone.

```bash
python3 .codex/skills/bangle-project-operator/scripts/bangle_project.py update \
  --item-id PVTI_... \
  --status in-progress \
  --iteration current \
  --dry-run
```

Use `--title` or `--body-file` only for draft items. For repository issues or pull requests, change project fields with this helper and use the appropriate GitHub workflow only when public content edits are in scope. Use `--clear-field w` to unschedule an item; clearing or moving commitments needs explicit evidence or user direction.

## Reconcile with Repository Reality

- Treat code, merged/open PR state, issue state, active plans, and explicit maintainer decisions as evidence. Treat titles, unchecked lists, stale bodies, and branch names as leads to verify.
- Mark work `Done` only after confirming the delivered outcome, normally through a merged PR or an explicit decision. Record the completion PR or decision in the draft body.
- Mark work `In progress` only when implementation has started or an active PR owns it. Record PR readiness and the next action.
- Keep unstarted but pickup-ready work in `Backlog`; move work to `icebox` only for deliberate deferral.
- Ensure every unfinished repository plan has exactly one canonical draft item. Link related issues/PRs in that item rather than creating competing cards.
- Preserve useful context when updating bodies. Amend stale sections; do not erase decisions, constraints, recovery concerns, or acceptance criteria merely to make an item shorter.
- Never implement repository code merely because a board-management request reveals work. Implement only when the user also asks to do the engineering work.

## Failure Handling

- If `gh` lacks project scope, run `gh auth refresh -h github.com -s project` and let the user complete authentication.
- If a write partially succeeds, stop. Report the created or changed item ID and the exact field that failed; do not create a replacement item.
- If board and repository evidence conflict, preserve both, explain the conflict, and ask only the smallest question needed to choose the authoritative state.
