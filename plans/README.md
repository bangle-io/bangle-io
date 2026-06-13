---
title: Plans Index
status: active
type: convention
created: 2026-06-13
updated: 2026-06-13
---

# Plans

This directory stores durable planning and handoff notes for work that spans
multiple commits, agents, or sessions.

## Naming

Use a stable numeric prefix followed by a kebab-case topic:

```text
001-dependency-update-modernization.md
002-storybook-major-upgrade.md
003-typescript-major-upgrade.md
```

Do not renumber existing plans after they are referenced by commits, issues, or
pull requests.

## Frontmatter

Every plan must start with YAML frontmatter:

```yaml
---
title: Human-readable title
status: planned | active | blocked | completed | superseded
type: plan
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
