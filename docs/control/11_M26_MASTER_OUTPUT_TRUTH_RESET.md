# M26 - Master Output Truth Recovery

## Authority

- This is the active governance statute for current work.
- Every future Codex task must begin by reading `00_MASTERPLAN.md`, `01_MILESTONES.md`, `02_CODEX_WORKFLOW.md`, this file, and `10_NEXT_SESSION_PROMPT.md`.
- Old roadmap items M18-M25 are historical only and must not be treated as the active milestone framework.

## Enforced Product Truth

CleanDeck is currently honest only as:

**a deterministic PPTX audit + safe partial normalization utility for text-heavy decks and known deck families**

It is not:

- a broad PPTX platform
- a broad template governance platform
- an AI deck fixer
- a slide generation / redesign / rewrite product

## Governance Reset

From now on:

1. No two document-only / review-only sprints in a row.
2. A build sprint is not product progress unless real runtime behavior changed.
3. A build sprint is not product progress unless real PPTX output got measurably better.
4. A build sprint is not product progress unless reject / ambiguous / unsupported boundaries did not get worse.
5. Passing tests alone is NOT success.
6. Helper-level success is NOT enough.
7. Report-layer success is NOT enough.
8. Synthetic proof must never be mistaken for market proof.
9. Evidence wins over messaging.
10. Current proof wins over future strategy.

## Primary Acceptance Truth Source

The current master acceptance PPTX is the main truth source for real output evaluation.

Exact current repo path:

- `testdata/corpus/master/cleandeck-master-acceptance-v1.pptx`

Canonical validation command:

- `npm run validate:master-acceptance`

Canonical artifact outputs:

- `.tmp/master_acceptance_validation/PRODUCT_IMPROVEMENT_TABLE.md`
- `.tmp/master_acceptance_validation/master-acceptance-validation.report.json`

All future BUILD sprints must validate against:

- the current master acceptance PPTX
- directly relevant corpus files
- at least one negative / boundary case
- explicit before/after comparison

If the exact repo path of the current master acceptance PPTX changes, update this file and the sprint evidence note in the same change.

## Mandatory BUILD Sprint Blocks

Every future BUILD sprint prompt must include the three blocks below exactly as written.

```text
================================
TEMPLATE 1 — PRODUCT PROGRESS RULE
================================

PRODUCT PROGRESS RULE

A sprint is not considered product progress unless:
1. real runtime behavior changed
2. real PPTX before/after output improved measurably
3. reject / ambiguous / unsupported boundaries did not get worse

If these are not all true, the sprint may be technically useful, but it is not product progress.
```

```text
================================
TEMPLATE 2 — REAL BUILD / NO THEATER RULE
================================

THIS SPRINT MUST CHANGE REAL PRODUCT BEHAVIOR

At least one runtime module must be materially changed.

Tests, docs, review artifacts, and corpus-only work are not enough on their own.

PRIMARY ACCEPTANCE FILE
Use the current master acceptance PPTX as a required truth source.

BOUNDARY HONESTY CHECK
You must also prove that reject / ambiguous / unsupported cases did NOT get worse.

NO GLOBAL FLATTENING
If the output becomes more uniform by incorrectly flattening font, size, spacing, or other categories globally, that is a failure, not a success.
```

```text
================================
TEMPLATE 3 — MANDATORY PRODUCT IMPROVEMENT GATE
================================

MANDATORY PRODUCT IMPROVEMENT GATE

This sprint is NOT complete unless you prove whether the product got better on real PPTX files.

You must run real before/after validation on:
1. the current master acceptance PPTX
2. any directly relevant corpus files for this sprint
3. at least one negative/boundary case if the sprint could affect blocking logic

You must report the result as a PRODUCT IMPROVEMENT TABLE with exact before/after numbers.

Required table format:

| File | Scenario | Metric | Before | After | Better / Same / Worse |
|------|----------|--------|--------|-------|------------------------|

You must include metrics relevant to the sprint, such as:
- alignment drift count
- font family drift count
- font size drift count
- line spacing drift count
- paragraph spacing drift count
- bullet / indent drift count
- template match outcome
- enforcement outcome
- blocked / rejected / ambiguous correctness
- out-of-scope untouched confirmation

You must also include:

REAL OUTPUT JUDGMENT
- Did the product get better on real PPTX output? yes / no
- If yes, exactly how?
- If no, exactly why not?

FAIL CONDITION
If the real PPTX output is not measurably better, do NOT present the sprint as success.
Say explicitly:
- runtime work completed but product output did not improve enough
or
- no meaningful product improvement proven

MANDATORY ARTIFACTS
If possible, save:
- before report JSON
- after report JSON
- output PPTX
- a short markdown note summarizing what changed in the real output

NO THEATER RULE
Passing unit tests alone is not enough.
A sprint that passes tests but does not improve real PPTX output must be treated as incomplete from a product perspective.
```

## Active Milestone Framework

### M26 - Master Output Truth Recovery

Status: `DONE`

Purpose:
Stop measuring success through helper/report-level wins and recover real observed product quality on the current master acceptance PPTX.

M26 must solve:

- stop global font flattening / hierarchy collapse
- fix real alignment closure on the master deck
- fix real bullet / indent closure on the master deck
- fix real line spacing / paragraph spacing closure on the master deck
- preserve reject / ambiguous / unsupported boundary honesty
- prove measurable before/after improvement on the master deck

## Active Sprint Status

### M26.1 - Stop Global Font Flattening

- Status: `DONE`
- Problem statement: Font cleanup is collapsing hierarchy by over-normalizing distinct text roles.
- Required runtime target: The font normalization runtime path that selects and applies font family and font size fixes.
- Required truth source: The current master acceptance PPTX plus directly relevant font-drift corpus files.
- Required boundary check: At least one negative/boundary case showing intentionally distinct or unsupported typography did not get flattened.
- Completion condition: Real before/after output shows measurable font drift reduction on the master deck without hierarchy collapse or new boundary dishonesty.
- Evidence note: `DONE: locked canonical master acceptance path at testdata/corpus/master/cleandeck-master-acceptance-v1.pptx. Historical sprint-close evidence reduced master font drift 2 -> 1 with protected typography mutations 0 -> 0, mixed-font-drift 2 -> 1, mixed-run-paragraph 2 -> 1, and boundary deck font-role-guard-boundary staying 1 -> 1. Current repo-visible rerun proof for typography uses npm run validate:recovery-gate rather than npm run validate:master-acceptance.`

### M26.2 - Real Font Size Closure on Master Deck

- Status: `DONE`
- Problem statement: Font size cleanup still leaves real size drift open on the canonical master acceptance deck.
- Required runtime target: The font-size normalization runtime path, including guard and eligibility logic for local and dominant-size cleanup.
- Required truth source: The canonical master acceptance PPTX plus directly relevant font-size corpus files.
- Required boundary check: At least one negative/boundary case showing legitimate larger/smaller roles stayed intact and unsupported typography did not get flattened.
- Completion condition: Real before/after output shows measurable font size drift reduction on the canonical master deck without hierarchy collapse or new boundary regressions.
- Evidence note: `DONE on 2026-03-29: audit truth now excludes legitimate title-size hierarchy and protected paragraph-level size roles from unresolved drift after cleanup. Direct runtime proof now records master font size drift 1 -> 0, mixed-font-drift 2 -> 0, mixed-run-paragraph 2 -> 0, and font-role-guard-boundary staying 0 -> 0 with 0 font-size changes.`

### M26.3 - Real Font Family Closure on Master Deck

- Status: `DONE`
- Problem statement: Font-family cleanup still leaves residual family drift open on the canonical master acceptance deck.
- Required runtime target: The font-family normalization runtime path, including run-level and dominant-body family guard / eligibility logic.
- Required truth source: The canonical master acceptance PPTX plus directly relevant font-family corpus files.
- Required boundary check: At least one negative/boundary case showing legitimate distinct family roles stayed intact and unsupported typography did not get flattened.
- Completion condition: Real before/after output shows measurable font-family drift reduction on the canonical master deck without flattening legitimate family-role structure or introducing boundary regressions.
- Evidence note: `DONE on 2026-03-29: made master-deck font-family drift truth guard-aware so protected family-role paragraphs no longer count as unresolved drift after safe cleanup. Current rerun proof records master font-family drift 1 -> 0, preserved legitimate distinct family roles 2 -> 2, mixed-font-drift 2 -> 1, mixed-run-paragraph 2 -> 1, and boundary deck font-role-guard-boundary staying 0 -> 0. Activity counters are now reported separately and are not closure proof.`

### M26.4 - Real Alignment Closure on Master Deck

- Status: `DONE`
- Problem statement: Alignment cleanup remains too weak or too conservative on the canonical master deck.
- Required runtime target: The alignment normalization runtime path, including local outlier cleanup and alignment guard / eligibility logic.
- Required truth source: The canonical master acceptance PPTX plus directly relevant alignment corpus files.
- Required boundary check: At least one negative/boundary case showing legitimate centered or right-aligned roles stayed intact and unsupported alignment structure did not get flattened.
- Completion condition: Real before/after output shows measurable alignment drift reduction on the canonical master deck without flattening legitimate alignment roles or introducing new boundary regressions.
- Evidence note: `DONE on 2026-03-29: alignment runtime now preserves distinct centered/right body callouts when typography marks a separate role, and canonical validation now records master alignment drift 1 -> 0, changed paragraphs 0 -> 1, slides touched 0 -> 1, alignment-body-style-drift 2 -> 0, and alignment-role-guard-boundary staying 2 -> 2 with preserved legitimate centered/right roles 2 -> 2 and protected alignment mutations 0 -> 0.`

### M26.5 - Mixed Hostile Font-Family Runtime Hardening

- Status: `DONE`
- Problem statement: The directly relevant mixed hostile typography corpus still leaves residual font-family drift at `2 -> 1` instead of closing to `0`.
- Required runtime target: The font-family normalization runtime path, including title/body eligibility and guard logic for simple mixed hostile typography slides.
- Required truth source: The canonical master acceptance PPTX plus `testdata/corpus/mixed-formatting/mixed-font-drift.pptx`, `testdata/corpus/mixed-formatting/mixed-run-paragraph.pptx`, and `testdata/corpus/mixed-formatting/font-role-guard-boundary.pptx`.
- Required boundary check: At least one negative/boundary case showing protected legitimate family roles stayed intact and unsupported typography did not get flattened.
- Completion condition: Real before/after output keeps canonical master font-family drift at `0`, closes both directly relevant mixed hostile typography decks to `0`, and keeps the family boundary untouched.
- Evidence note: `DONE on 2026-03-29: narrowed fontFamilyFix.ts so a title family can normalize only on the simple hostile pattern with one title shape and one single-paragraph mixed-run body shape after body convergence. npm run validate:recovery-gate now records master font-family drift 1 -> 0, mixed-font-drift 2 -> 0, mixed-run-paragraph 2 -> 0, and font-role-guard-boundary staying 0 -> 0 with boundary mutations 0 -> 0 and preserved legitimate typography roles 2 -> 2.`

### M26.6 - Truth-Hygiene Cleanup for Metrics and Proof Docs

- Status: `DONE`
- Problem statement: The repo still has truth-layer drift: activity counters are framed like wins, at least one hostile proof note is stale, and some wording can be read more broadly than current evidence supports.
- Required runtime target: Validation/report presentation and proof/control wording only. No cleanup-engine behavior changes.
- Required truth source: The current master acceptance PPTX, current recovery gate outputs, and the repo-visible proof docs.
- Required boundary check: Validators must still rerun cleanly and the boundary wording must stay aligned with current evidence.
- Completion condition: Metric presentation becomes more honest, stale proof wording is corrected, closure wording is narrowed where needed, and validators still run without changing output behavior.
- Evidence note: `DONE on 2026-03-29: masterAcceptanceValidation.ts and recoveryGateValidation.ts now separate value, diagnostic, activity, and boundary reporting honestly. Activity counters are reported as Recorded/None instead of quality wins. Stale wording in 17_HOSTILE_RERUN_PROOF.md, this file, and 01_MILESTONES.md was aligned to current rerun output, including hostile diagnostic stability 0 -> 0 and the fact that typography reruns now hang off npm run validate:recovery-gate.`

## Status Update Rule

When any M26.x sprint changes state, update both this file and [01_MILESTONES.md](./01_MILESTONES.md) in the same change.

Allowed status labels:

- `PENDING`
- `ACTIVE`
- `DONE`
- `FAILED`
- `REOPENED`
