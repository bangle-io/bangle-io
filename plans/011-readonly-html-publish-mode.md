---
title: Readonly HTML publish mode
status: planned
type: plan
archived: false
archived_on:
created: 2026-08-03
updated: 2026-08-03
owner: mixed
related_prs: []
related_issues: []
---

# Readonly HTML publish mode

## Summary

TBD. This plan tracks the Bangle Publish epic task for rendering notes as
readonly HTML for viewing and publishing rather than opening the editor.

Project task: [Readonly HTML mode](https://github.com/orgs/bangle-io/projects/5/views/4).

## Current status

Planned. Product behavior, rendering architecture, routing, security model,
and delivery scope are all TBD.

## Scope

TBD. Candidate areas to define include:

- how a note enters readonly publish mode;
- which Markdown and embedded content are supported;
- how the non-editable rendering differs from the editor;
- publishing, sharing, and access boundaries; and
- accessibility, responsive layout, and theming requirements.

## Out of scope

TBD after the publish-mode boundaries are defined.

## Verification

TBD. The eventual plan should specify user-visible Playwright coverage,
Markdown-fidelity checks, and any relevant persistence or security validation.

## Known blockers

- Product and technical requirements have not yet been flushed out.

## Next steps

1. Define the intended publish workflow and access model.
2. Identify the owning packages and existing rendering primitives.
3. Turn the agreed behavior into scoped implementation milestones and
   acceptance criteria.
