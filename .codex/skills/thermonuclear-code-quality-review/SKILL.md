---
name: thermonuclear-code-quality-review
description: Perform an unusually strict code-quality audit focused on structural simplification, maintainability, abstraction quality, file growth, branching complexity, type boundaries, architectural ownership, and test quality. Use for thermonuclear reviews, deep maintainability audits, harsh code-quality reviews, or reviews that should seek ambitious behavior-preserving restructuring rather than local cleanup.
---

# Thermonuclear Code Quality Review

Audit the current branch's changes with an approval bar substantially higher than “works and passes tests.” Seek behavior-preserving restructurings that make the implementation smaller, more direct, and easier to reason about.

## Establish the review scope

1. Read the repository instructions and run commands from the repository root.
2. Inspect the working tree, branch, merge base, diff statistics, and complete diff. Include staged and unstaged changes.
3. Identify the owning packages and read enough surrounding code to understand canonical helpers, dependency boundaries, and existing state models.
4. Measure changed file sizes before accepting file growth.
5. Run relevant validation when practical. Never hide failures; distinguish introduced failures from existing ones.

Do not modify code unless the user explicitly asks for implementation. A review request authorizes inspection and validation, not fixes.

## Apply the approval bar

Block approval when any of these conditions has no compelling justification:

- The change preserves incidental complexity that a plausible restructuring could delete.
- A file crosses from below 1,000 lines to above 1,000 lines.
- Feature checks or ad-hoc conditionals are scattered through unrelated flows.
- Feature logic leaks into a shared path or the wrong architectural layer.
- A wrapper, generic mechanism, cast-heavy contract, or optional parameter adds indirection without clarifying an invariant.
- The change duplicates a canonical helper, state transition, lifecycle, or orchestration flow.
- Related updates can leave partial state, or independent work is needlessly serialized.
- Tests pass while the implementation makes the surrounding code harder to maintain.

Do not approve merely because behavior appears correct.

## Search for code-judo simplifications

For every meaningful change, ask:

- Can the model be reframed so entire branches, flags, modes, helpers, or layers disappear?
- Can ownership move to the layer that already owns the concept?
- Can two parallel workflows become one parameterized lifecycle or typed state transition?
- Can a special case become part of the default flow?
- Can an abstraction be deleted in favor of direct code?
- Can duplicated business rules move to the lowest valid shared package?
- Can explicit types remove casts, silent fallbacks, or unnecessary optionality?
- Can orchestration become atomic or parallel while remaining clearer?

Prefer simplifications that reduce the number of concepts a reader must hold. Moving the same complexity into more files is not a successful refactor.

## Inspect aggressively

Prioritize these review categories:

1. Structural regressions and missed dramatic simplifications.
2. Spaghetti growth: new flags, nullable modes, special-case branches, and incidental control flow.
3. State ownership, atomicity, lifecycle cleanup, async ordering, and failure behavior.
4. Architectural boundaries, canonical helpers, and package placement.
5. Type and API boundary cleanliness.
6. File-size growth and decomposition.
7. Test quality, especially whether regression tests prove user-visible behavior and failure paths.
8. Legibility issues that materially increase maintenance cost.

Treat these patterns as strong smells:

- Multiple components independently managing the same draft, commit, dismiss, focus, or persistence lifecycle.
- UI observers redefining core commands to fit a local state model.
- Shared atoms or registries without explicit per-owner identity and cleanup.
- Copy-pasted condition chains with small variations.
- Broad `unknown`, `any`, assertions, or silent fallback masking an unclear contract.
- Generic “magic” handling that hides a simple known data shape.
- Thin pass-through wrappers that do not reduce caller complexity.
- Tests that delete failure coverage after a refactor or only verify the happy path.
- Unrelated fixes added to compensate for a side effect introduced elsewhere.

## Validate findings

Trace each suspected issue through callers, state transitions, and tests. Prefer a smaller number of high-confidence findings over speculative or cosmetic comments.

For each finding:

- State the concrete failure or maintainability cost.
- Explain why the current structure causes it.
- Identify the smallest coherent structural remedy.
- Cite a tight file and line range.
- Assign severity based on impact, not rhetorical force.

If a restructuring is only a preference and does not materially improve maintainability, omit it.

## Report the review

Lead with findings ordered by severity. Use inline code comments when supported. Keep summaries brief and include:

- Whether the change meets the thermonuclear approval bar.
- Validation commands run and their exact outcomes.
- Any important testing gaps or assumptions.
- An explicit statement when no high-confidence findings remain.

Do not flood the review with naming or formatting nits while structural issues remain.
