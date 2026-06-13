---
title: Plans Directory Instructions
status: active
type: instructions
archived: false
created: 2026-06-13
updated: 2026-06-13
---

# Plans Directory Instructions

This directory stores durable planning and handoff notes for work that spans
multiple commits, agents, or sessions.

## Naming

Use a stable numeric prefix followed by a kebab-case topic. Keep related work in
one plan unless it is genuinely a separate initiative.

```text
001-dependency-update-modernization.md
```

Add `002-*` only when a new plan cannot reasonably live inside an existing plan.
Do not renumber existing plans after they are referenced by commits, issues, or
pull requests.

## Frontmatter

Every plan must start with YAML frontmatter:

```yaml
---
title: Human-readable title
status: planned | active | blocked | completed | superseded
type: plan
archived: false
created: YYYY-MM-DD
updated: YYYY-MM-DD
owner: agent | human | mixed
related_prs:
  - https://github.com/owner/repo/pull/123
related_issues: []
---
```

## Content

Prefer short, durable sections:

- Summary
- Current status
- Scope
- Out of scope
- Verification
- Known blockers
- Next steps

Keep transient scratch notes out of plans. If a plan is completed, update its
status and final verification instead of deleting it.

## Archiving

When a plan is fully complete, move it to `plans/archived/`, set
`archived: true`, set `status: completed`, and prepend a DONE blockquote
immediately after the YAML frontmatter:

```md
---
title: Example Plan
status: completed
type: plan
archived: true
created: 2026-01-01
updated: 2026-06-13
owner: mixed
related_prs: []
related_issues: []
---

> DONE Completed on 2026-06-13 in PR #123. Final verification passed with
> `pnpm run lint:ci`, `pnpm test:ci`, and Playwright CLI smoke testing.

# Example Plan
```

Use the DONE note for future context: what finished, when, which PR/commit
completed it, and any caveats worth preserving.
