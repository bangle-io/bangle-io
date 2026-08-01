---
title: Architecture primitives — versioned storage, loss-aware codec, container lifetimes
status: planned
type: plan
archived: false
archived_on:
created: 2026-08-01
updated: 2026-08-01
owner: mixed
related_prs:
  - https://github.com/bangle-io/bangle-io/pull/626
related_issues:
  - https://github.com/bangle-io/bangle-io/issues/521
---

# Architecture Primitives

## Summary

The external-change auto-refresh work (PR #626) shipped correct behavior by
compensating for primitives the lower layers do not provide: echo detection,
conflict detection, and Markdown loss detection are heuristics at the top of
the stack, and cross-lifetime objects are hand-threaded through the
composition root. The compensations are fenced and test-collateralized; this
plan records the primitives that would replace them, each with an explicit
trigger. None of this is scheduled — pick up a milestone when its trigger
fires, not before.

## Scope

- **M1 — Versioned storage contract.** Reads on `BaseFileStorageProvider`
  return an opaque version token; writes accept an expected token (CAS) and
  record the token they produce. Echo detection becomes a token comparison in
  the adapter; overwrite races become a typed refusal. Exit criteria:
  `external-content-sync.ts` drops the double stable read and the
  serializer-equality echo branch. *Trigger: the next feature needing echo or
  conflict detection (snapshot backends, sync, desktop), or the first
  echo-heuristic bug in the wild.*
- **M2 — Loss-aware Markdown codec.** Parsing returns the document plus a
  structured loss report, owned by the codec; `round-trip-check.ts` shrinks
  to a consumer and the byte-diff remains only as the normalization signal.
  Design the report shape together with the wordgard-markdown corpus work
  (plans 011/012) so both engines share it. *Trigger: the next silent-loss
  hole in the regex gate, or whenever wordgard-markdown builds its
  loss/parity reporting.*
- **M3 — Container lifetimes.** `poor-mans-di` grows a browser-root scope
  (save coordinator, root emitter stop being hand-threaded) and a
  workspace-session scope that owns watchers, `fsCache` entries, and
  per-workspace invalidation — disposal on workspace close is the eviction
  story. *Trigger: the next browser-root object, or watcher/cache growth
  showing up in practice.*
- **M4 — Platform `pageLifecycle` slot.** A small platform capability that
  the router and `FileStorageNativeFs` both depend on via `static deps`,
  deleting the late-bound `getRouter` closure. Independent and cheap; can
  land any time.

## Out of scope

- Rewriting `external-content-sync.ts` for its own sake — it shrinks as a
  consequence of M1/M2, and its interleaving spec bank is the collateral
  that must stay green throughout.
- Consumer-side event mechanics (sequence dedup, counter vocabulary) — plan
  015 owns that record.
- Any user-visible behavior change.

## Verification

Contract tests for M1 shared across all three adapters; the existing
external-sync specs and NativeFS Playwright suite pass unchanged at every
milestone; M2 asserts loss reports against the golden corpus for both
serializers. Standard `AGENTS.md` gates apply.

## Next steps

None scheduled. First mover when picked up: M4, then a spike on M1 token
semantics (can NativeFS `lastModified` + size be trusted across external
writers?).
