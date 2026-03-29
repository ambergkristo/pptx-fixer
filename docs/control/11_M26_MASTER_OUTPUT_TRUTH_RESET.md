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

Status: `ACTIVE`

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
- Evidence note: `DONE: locked canonical master acceptance path at testdata/corpus/master/cleandeck-master-acceptance-v1.pptx. Canonical validation via npm run validate:master-acceptance now records master font drift 2 -> 1 with protected typography mutations 0 -> 0, mixed-font-drift 2 -> 1, mixed-run-paragraph 2 -> 1, and boundary deck font-role-guard-boundary staying 1 -> 1 with protected typography mutations 0 -> 0.`

### M26.2 - Real Font Size Closure on Master Deck

- Status: `DONE`
- Problem statement: Font size cleanup still leaves real size drift open on the canonical master acceptance deck.
- Required runtime target: The font-size normalization runtime path, including guard and eligibility logic for local and dominant-size cleanup.
- Required truth source: The canonical master acceptance PPTX plus directly relevant font-size corpus files.
- Required boundary check: At least one negative/boundary case showing legitimate larger/smaller roles stayed intact and unsupported typography did not get flattened.
- Completion condition: Real before/after output shows measurable font size drift reduction on the canonical master deck without hierarchy collapse or new boundary regressions.
- Evidence note: `DONE on 2026-03-29: narrowed the font-size guard so fully ambiguous mixed-size groups stay protected, but body groups with clear paragraph-level roles can still normalize mixed-run size outliers safely. Canonical validation now records master font size drift 8 -> 7, changed text runs 0 -> 1, slides touched 0 -> 1, preserved larger/smaller legitimate roles 2 -> 2, mixed-font-drift 2 -> 0, mixed-run-paragraph 2 -> 0, and boundary deck font-role-guard-boundary staying 2 -> 2 with protected typography mutations 0 -> 0.`

### M26.3 - Real Font Family Closure on Master Deck

- Status: `FAILED`
- Problem statement: Font-family cleanup still leaves residual family drift open on the canonical master acceptance deck.
- Required runtime target: The font-family normalization runtime path, including run-level and dominant-body family guard / eligibility logic.
- Required truth source: The canonical master acceptance PPTX plus directly relevant font-family corpus files.
- Required boundary check: At least one negative/boundary case showing legitimate distinct family roles stayed intact and unsupported typography did not get flattened.
- Completion condition: Real before/after output shows measurable font-family drift reduction on the canonical master deck without flattening legitimate family-role structure or introducing boundary regressions.
- Evidence note: `FAILED on 2026-03-29: canonical validation plus direct runAllFixes probes confirm master font drift remains 2 -> 1, mixed-font-drift remains 2 -> 1, mixed-run-paragraph remains 2 -> 1, and boundary font-role-guard-boundary stays 1 -> 1 with the Georgia family role preserved. The remaining master drift is the protected Georgia callout, so no additional safe family closure was proven on the canonical deck.`

### M26.4 - Line + Paragraph Spacing Closure on Master Deck

- Status: `PENDING`
- Problem statement: Line spacing and paragraph spacing drift remain open on the master deck.
- Required runtime target: Paragraph spacing and line spacing runtime modules.
- Required truth source: The current master acceptance PPTX plus directly relevant spacing corpus files.
- Required boundary check: At least one negative/boundary case showing spacing conflict or unsupported layout cases did not get worse.
- Completion condition: Real before/after output shows measurable spacing drift reduction on the master deck without layout damage.
- Evidence note: `TODO`

### M26.5 - Boundary Honesty Recovery on Reject / Ambiguous / Unsupported Slides

- Status: `PENDING`
- Problem statement: Boundary logic can drift when cleanup pressure increases.
- Required runtime target: Eligibility, rejection, ambiguity, and unsupported-case runtime decision path.
- Required truth source: The current master acceptance PPTX where relevant plus directly relevant boundary corpus files.
- Required boundary check: At least one negative/boundary case is mandatory because boundary honesty is the sprint target.
- Completion condition: Real before/after output and logs show reject / ambiguous / unsupported classification stayed truthful or improved.
- Evidence note: `TODO`

### M26.6 - Master Deck Recovery Gate Review

- Status: `PENDING`
- Problem statement: The repo needs a final gate that proves master-deck recovery without control-plane theater.
- Required runtime target: End-to-end runtime validation and truth-reporting across the recovered modules.
- Required truth source: The current master acceptance PPTX, all directly relevant corpus files used in M26.1-M26.5, and at least one negative/boundary case.
- Required boundary check: Boundary honesty must be rechecked across the combined run before this sprint can close.
- Completion condition: A product improvement table proves measurable master-deck recovery and no worse boundary honesty.
- Evidence note: `TODO`

## Status Update Rule

When any M26.x sprint changes state, update both this file and [01_MILESTONES.md](./01_MILESTONES.md) in the same change.

Allowed status labels:

- `PENDING`
- `ACTIVE`
- `DONE`
- `FAILED`
- `REOPENED`
