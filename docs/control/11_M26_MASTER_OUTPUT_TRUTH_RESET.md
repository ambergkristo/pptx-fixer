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

## Current Product Build Track

- Active phase: `Phase 2 - MVP Proof and External Beta Readiness`
- Active sprint: `M21.4 - Deck Readiness Gate Hardening`
- Status: `DONE`
- Scope note: Strengthen the product-shell readiness surface so the result screen explains why a deck is Ready / Mostly ready / Manual review needed, which unresolved categories are blocking a better state, what improved, and whether the current output is good enough to use now or still needs review. Use only current fix-report data and keep the language conservative.
- Evidence note: `DONE on 2026-03-29: the product-shell readiness surface now renders explicit label reasons, blocker categories, improved-vs-unresolved category lists, and use-now guidance from current FixReport data. Real deck validation confirmed the surface shows these decisions correctly for the canonical master, hostile chaos gate, mixed hard boundary, and combined QA decks without fake scoring or unsupported safety claims.`

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

Current repo-visible closure proof:

- `npm run validate:recovery-gate` records zero remaining value drift on the admitted canonical master and hostile recovery surfaces
- admitted boundary decks stay unchanged on boundary metrics
- `node --test tests/corpusRegression.test.ts` passes against the admitted corpus set

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

### M26.7 - Mixed Hard Boundary Safety Recovery

- Status: `DONE`
- Problem statement: The committed mixed hard boundary deck was mutating intentional structure, with boundary mutations `0 -> 3`, which was a safety failure on an expect-untouched deck.
- Required runtime target: The exact runtime fix paths and guard logic causing one intentional font-size change and two intentional spacing changes on `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`.
- Required truth source: `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, the canonical master acceptance PPTX, and `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`.
- Required boundary check: Mixed hard boundary mutations must improve to `0`, preserved legitimate centered/right-aligned roles must stay intact, preserved legitimate distinct family/size roles must stay intact, and master/hostile proof must not regress.
- Completion condition: Real before/after output shows `mixed-hard-boundary-v1` boundary mutations `3 -> 0` without weakening validators or regressing current master/hostile proof.
- Evidence note: `DONE on 2026-03-29: tightened font-size guards for standalone non-left alignment roles and spacing eligibility for uniformly centered/right-aligned role shapes. npm run validate:recovery-gate now records mixed-hard-boundary-v1 boundary mutations 3 -> 0, preserved legitimate centered/right-aligned roles 5 -> 5, preserved legitimate distinct family/size roles 1 -> 1, paragraph spacing diagnostic stability 3 -> 3, and no new master or hostile regressions in already-closed categories.`

### M26.8 - Hostile Line-Spacing Closure

- Status: `DONE`
- Problem statement: The hostile chaos gate deck left line-spacing value drift stuck at `5 -> 5`.
- Required runtime target: The line-spacing normalization runtime path and any guard/eligibility logic blocking safe hostile leading cleanup on `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`.
- Required truth source: `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, and the canonical master acceptance PPTX.
- Required boundary check: Hostile line-spacing drift must improve while mixed hard boundary stays at `0` mutations, preserved legitimate alignment and typography roles stay intact, and the canonical master deck does not regress.
- Completion condition: Real before/after output shows hostile line-spacing value drift improves below `5` without boundary regression or new master regressions.
- Evidence note: `DONE on 2026-03-29: tightened lineSpacingFix.ts to repair two safe hostile patterns only: explicit same-kind majority outliers within one uninterrupted block and a trailing outlier before an inherited gap when a later explicit baseline confirms the target. npm run validate:recovery-gate now records hostile cleandeck-chaos-gate-v1 line spacing value drift 5 -> 3, mixed hard boundary boundary mutations 0 -> 0, preserved legitimate centered/right-aligned roles 5 -> 5, preserved legitimate distinct family/size roles 1 -> 1, and canonical master line spacing proof staying 4 -> 0.`

### M26.9 - Master Paragraph-Spacing Closure

- Status: `DONE`
- Problem statement: The canonical master acceptance deck still leaves paragraph-spacing value drift stuck at `5 -> 5`.
- Required runtime target: The paragraph-spacing normalization runtime path and any guard/eligibility logic blocking safe master spacing cleanup on `testdata/corpus/master/cleandeck-master-acceptance-v1.pptx`.
- Required truth source: `testdata/corpus/master/cleandeck-master-acceptance-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, and `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`.
- Required boundary check: Canonical master paragraph-spacing drift must improve while mixed hard boundary stays safe, preserved legitimate alignment and typography roles stay intact, and hostile already-closed proof does not regress.
- Completion condition: Real before/after output shows canonical master paragraph-spacing value drift improves below `5` without boundary regression, hostile regression, or validator weakening.
- Evidence note: `DONE on 2026-03-29: tightened spacingFix.ts with a narrow second pass for fully-uniform left/inherit line-spacing blocks that remain slide-wide paragraph-spacing outliers after local cleanup. npm run validate:recovery-gate now records canonical master paragraph spacing value drift 5 -> 1, mixed hard boundary boundary mutations staying 0 -> 0, preserved legitimate centered/right-aligned roles 5 -> 5, preserved legitimate distinct family/size roles 1 -> 1, and hostile already-closed categories staying closed.`

### M26.10 - Hostile Paragraph-Spacing Closure

- Status: `DONE`
- Problem statement: The hostile chaos gate deck still leaves paragraph-spacing value drift at `3 -> 1`.
- Required runtime target: The paragraph-spacing normalization runtime path and any guard/eligibility logic blocking safe hostile spacing cleanup on `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`.
- Required truth source: `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, and the canonical master acceptance PPTX.
- Required boundary check: Hostile paragraph-spacing drift must improve while mixed hard boundary stays safe, preserved legitimate alignment and typography roles stay intact, and canonical master proof does not regress.
- Completion condition: Real before/after output shows hostile paragraph-spacing value drift improves below the current remaining state without boundary regression, master regression, or validator weakening.
- Evidence note: `DONE on 2026-03-29: tightened spacingFix.ts so uniform non-left alignment protection only applies when every paragraph in the block is explicitly non-left. That admits the hostile mixed slide's centered spacing outlier without touching true centered/right role blocks. npm run validate:recovery-gate now records hostile cleandeck-chaos-gate-v1 paragraph spacing value drift 3 -> 0, mixed hard boundary boundary mutations staying 0 -> 0, preserved legitimate centered/right-aligned roles 5 -> 5, preserved legitimate distinct family/size roles 1 -> 1, and canonical master paragraph spacing proof staying 5 -> 1.`

### M26.11 - Hostile Line-Spacing Closure Finalization

- Status: `DONE`
- Problem statement: The hostile chaos gate deck still leaves line-spacing value drift at `5 -> 3`.
- Required runtime target: The line-spacing normalization runtime path and any guard/eligibility logic blocking the remaining safe hostile leading cleanup on `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`.
- Required truth source: `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, and the canonical master acceptance PPTX.
- Required boundary check: Hostile line-spacing drift must improve below `3` while mixed hard boundary stays safe, preserved legitimate alignment and typography roles stay intact, and canonical master proof does not regress.
- Completion condition: Real before/after output shows hostile line-spacing value drift improves below the current remaining state without boundary regression, master regression, or validator weakening.
- Evidence note: `DONE on 2026-03-29: extended lineSpacingFix.ts with two narrow inherited-bridge passes after local hostile normalization: one fills inherited paragraphs between stabilized explicit anchors inside a shape, and one fills a fully inherited secondary shape only when it is the sole remaining slide-wide drift against a strong explicit dominant baseline. npm run validate:recovery-gate now records hostile cleandeck-chaos-gate-v1 line spacing value drift 5 -> 0, mixed hard boundary boundary mutations staying 0 -> 0, preserved legitimate centered/right-aligned roles 5 -> 5, preserved legitimate distinct family/size roles 1 -> 1, and canonical master line spacing proof staying 4 -> 0.`

### M26.12 - Final Master Paragraph-Spacing Resolution

- Status: `DONE`
- Problem statement: The canonical master acceptance deck still leaves one final paragraph-spacing value residual at `5 -> 1`.
- Required runtime target: The final master paragraph-spacing runtime or audit-truth decision path responsible for the remaining residual on `testdata/corpus/master/cleandeck-master-acceptance-v1.pptx`.
- Required truth source: `testdata/corpus/master/cleandeck-master-acceptance-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, and `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`.
- Required boundary check: The final master residual must either close safely to `0` or be reclassified honestly as a protected intentional role, without regressing boundary or hostile proof.
- Completion condition: Real before/after output or product truth shows the final master paragraph-spacing residual is resolved honestly, with boundary mutations staying `0` and hostile proof staying at least as strong.
- Evidence note: `DONE on 2026-03-29: chose Path B after isolating the remaining master residual to the intentional centered standalone role on slide 3 of the canonical master deck. packages/audit/pptxAudit.ts now excludes protected non-left standalone paragraph-spacing roles from unresolved value drift, while runtime behavior stays unchanged. npm run validate:recovery-gate now records canonical master paragraph spacing value drift 4 -> 0, mixed hard boundary boundary mutations staying 0 -> 0, hostile chaos gate paragraph spacing staying 2 -> 0, and hostile line spacing staying 5 -> 0.`

### M26.14 - Combined QA Deck Alignment Closure

- Status: `DONE`
- Problem statement: The committed combined QA deck still leaves alignment drift flat at `2 -> 2` on its mixed alignment slide.
- Required runtime target: The alignment normalization runtime path and any guard/eligibility logic blocking safe repair of adjacent local centered/right body outliers on `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`.
- Required truth source: `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`, and the canonical master acceptance PPTX.
- Required boundary check: Combined-deck alignment drift must improve below `2`, protected boundary-role damage must stay `0`, mixed hard boundary safety must stay intact, and admitted hostile/master proof must not regress.
- Completion condition: Real before/after output shows the combined QA deck alignment drift improves materially without boundary-role damage, master regression, hostile regression, or validator weakening.
- Evidence note: `DONE on 2026-03-29: extended alignmentFix.ts to repair a two-paragraph adjacent outlier block only when matching anchors bracket the block and no distinct typography-role signal marks it as intentional. Combined QA deck alignment drift now improves 2 -> 0, protected boundary-role damage stays 0, mixed-hard-boundary-v1 stays at 0 -> 0 boundary mutations, hostile chaos gate alignment stays 2 -> 0, and canonical master alignment stays 1 -> 0.`

### M26.15 - Combined QA Deck Line-Spacing Closure

- Status: `DONE`
- Problem statement: The committed combined QA deck still leaves line-spacing drift at `7 -> 4` on its mixed spacing slide.
- Required runtime target: The line-spacing normalization runtime path and any guard/eligibility logic blocking safe inherited-shape convergence on `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`.
- Required truth source: `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`, and the canonical master acceptance PPTX.
- Required boundary check: Combined-deck line-spacing drift must improve below `4`, protected boundary-role damage must stay `0`, mixed hard boundary safety must stay intact, and admitted hostile/master proof must not regress.
- Completion condition: Real before/after output shows the combined QA deck line-spacing drift improves materially without boundary-role damage, master regression, hostile regression, or validator weakening.
- Evidence note: `DONE on 2026-03-29: extended lineSpacingFix.ts so slide-level inherited-shape convergence still admits the already-closed small residual-shape cases, while a stricter left-body-only guard allows larger inherited sibling-shape convergence on the combined deck. Combined QA deck line-spacing drift now improves 7 -> 0, protected boundary-role damage stays 0, mixed-hard-boundary-v1 stays at 0 -> 0 boundary mutations, hostile chaos gate line spacing stays 5 -> 0, and canonical master line spacing stays 4 -> 0.`

### M26.16 - Final Combined QA Deck Paragraph-Spacing Resolution

- Status: `DONE`
- Problem statement: The committed combined QA deck still leaves one final paragraph-spacing residual at `8 -> 1`.
- Required runtime target: The final combined-deck paragraph-spacing runtime or audit-truth decision path responsible for the remaining residual on `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`.
- Required truth source: `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`, `testdata/corpus/boundary/mixed-hard-boundary-v1.pptx`, `testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx`, and the canonical master acceptance PPTX.
- Required boundary check: The final combined residual must either close safely to `0` or be reclassified honestly as a protected intentional role, without regressing protected boundary-role damage or admitted master/hostile proof.
- Completion condition: Real before/after output or product truth shows the final combined-deck paragraph-spacing residual is resolved honestly, with protected boundary-role damage staying `0` and admitted proof surfaces staying at least as strong.
- Evidence note: `DONE on 2026-03-29: chose Path A after isolating the remaining residual to a standalone left-aligned explainer paragraph on slide 4 that the fixer skipped only because it lived alone in its own shape. spacingFix.ts now admits a single-paragraph slide-level normalization only when it is the sole remaining slide drift, non-bullet, left/inherit aligned, and the dominant slide signature is fully inherited. Combined QA deck paragraph spacing now improves 8 -> 0, protected boundary-role damage stays 0, mixed-hard-boundary-v1 stays at 0 -> 0 boundary mutations, hostile chaos gate paragraph spacing stays 2 -> 0, and canonical master paragraph spacing stays 4 -> 0.`

## Status Update Rule

When any M26.x sprint changes state, update both this file and [01_MILESTONES.md](./01_MILESTONES.md) in the same change.

Allowed status labels:

- `PENDING`
- `ACTIVE`
- `DONE`
- `FAILED`
- `REOPENED`
