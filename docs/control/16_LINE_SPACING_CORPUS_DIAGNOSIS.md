# CleanDeck - Line Spacing Corpus Diagnosis

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It defines the official Phase 1 / M20.1 diagnosis artifact for current line-spacing behavior across the corpus and current tooling.
- It does not implement line-spacing normalization fixes, paragraph-spacing work, readiness scoring changes, or M20.2+ closure work.

## Purpose

This diagnosis records the current truth for line spacing before any line-spacing normalization closure work starts.

It exists to answer:

- what the engine currently treats as line-spacing cleanup
- where line spacing is detected only
- where line spacing is materially reduced
- what unsafe or ambiguous cases must remain excluded
- what evidence is missing across the corpus classes
- what M20.2 must solve before line spacing can move beyond `Unproven`

## Inputs used for this diagnosis

### Control inputs

- [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md)
- [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md)
- [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md)
- [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md)

### Repo inputs

- [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json)
- [testdata/corpus/README.md](../../testdata/corpus/README.md)
- [packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts)
- [packages/audit/styleSignatureAudit.ts](../../packages/audit/styleSignatureAudit.ts)
- [packages/audit/cleanupCandidateAudit.ts](../../packages/audit/cleanupCandidateAudit.ts)
- [packages/fix/lineSpacingFix.ts](../../packages/fix/lineSpacingFix.ts)
- [packages/fix/dominantBodyStyleFix.ts](../../packages/fix/dominantBodyStyleFix.ts)
- [packages/fix/runAllFixes.ts](../../packages/fix/runAllFixes.ts)
- [packages/fix/issueCategorySummary.ts](../../packages/fix/issueCategorySummary.ts)
- [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts)
- [packages/fix/reportConsistencySummary.ts](../../packages/fix/reportConsistencySummary.ts)

### Tests and runs used as evidence

- `node --test tests/lineSpacingFix.test.ts tests/dominantBodyStyleFix.test.ts tests/corpusRegression.test.ts tests/deckReadinessSummary.test.ts tests/issueCategorySummary.test.ts tests/reportConsistencySummary.test.ts`
- manifest-wide audit + cleanup run across every deck in [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json)
- supplemental local-generated hostile signal from [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json)
- temporary synthetic fixture run proving dominant-body-style line-spacing reduction and current report output behavior

## What line-spacing cleanup currently covers in actual engine behavior

Current line-spacing behavior is narrower than the product label suggests.

It currently covers:

- explicit paragraph line spacing stored in `a:pPr/a:lnSpc`
- non-title text shapes only
- within-shape isolated explicit outliers when a local safe pattern exists
- body-group line-spacing normalization when a strict dominant body style exists and the line-spacing kind matches

It does not currently cover:

- inherited or default line spacing with no explicit `a:lnSpc`
- mixed `spcPts` and `spcPct` groups as a normalization target
- title line-spacing normalization
- generic paragraph rhythm redesign
- paragraph-spacing cleanup
- template-heavy, grouped-shape, field-node, or hostile semantics as a proven closure path

## Current detection and reduction model

### Detection-only path

[packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts) records `lineSpacingDrift` only when:

- a non-title text shape has at least two comparable paragraphs with explicit line spacing
- those explicit line-spacing signatures differ inside that same shape

If every explicit line-spacing signature in a comparable local group is unique, all explicit paragraphs in that group are marked as drift.

This means the current audited line-spacing category is explicit-only and shape-local.

### Reduction path 1: `lineSpacingFix`

[packages/fix/lineSpacingFix.ts](../../packages/fix/lineSpacingFix.ts) only fixes the safe local pattern:

- at least three explicit comparable paragraphs in one non-title text shape
- the current paragraph is a detected drift paragraph
- the previous and next paragraphs have the same explicit line spacing
- the current paragraph is the isolated outlier between them
- the unit kind matches on both sides

This is a narrow paragraph-neighbor repair, not a general line-spacing normalization system.

### Reduction path 2: `dominantBodyStyleFix`

[packages/fix/dominantBodyStyleFix.ts](../../packages/fix/dominantBodyStyleFix.ts) can also rewrite line spacing when:

- a strict dominant body style exists across eligible body groups
- the target body group has uniform explicit line spacing
- the target group is a cleanup candidate
- the line-spacing kind is compatible with the dominant body style

Unlike the alignment diagnosis from M19.1, the current synthetic verification shows that this path is already reflected in `verification.lineSpacingDriftBefore/After` and `issueCategorySummary` when the target group contains explicit line spacing.

## Corpus classes examined

The current manifest is still an inventory file, not a formal corpus-class map. For M20.1 diagnosis, the following decks were used as the nearest current in-repo proxies only.

### Clean reference deck proxies

- `simple-baseline`
- `theme-inherited-text`

### Mixed real-world deck proxies

- `mixed-font-drift`
- `mixed-run-paragraph`
- `bullet-heavy-list`
- `bullet-nested-structure`
- `bullet-symbol-drift`
- `bullet-indent-jump-drift`
- `alignment-body-style-drift`

### Edge-case / unsafe-case deck proxies

- `template-placeholders`
- `placeholder-template-dense`
- `field-node-mixed`
- `grouped-shapes-mixed`
- `slide-master-variation`

### Not closure-grade for line spacing

- `extended-multi-slide` is robustness-only inventory, not meaningful line-spacing proof by itself.

### Hostile stress-test class

- No officially admitted hostile stress deck is currently declared in the tracked manifest.
- [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json) provides supplemental hostile signal only.
- Therefore hostile line-spacing evidence is currently diagnostic only, not official acceptance-grade proof.

## Corpus results

### Official manifest-backed corpus result

Across all 15 tracked manifest decks examined by audit + cleanup:

- `lineSpacingDriftBefore = 0` for every deck
- `lineSpacingDriftAfter = 0` for every deck
- `lineSpacingChanges = 0` for every deck
- `dominantBodyStyleLineSpacingChanges = 0` for every deck
- `line_spacing` issue-category status remained `clean` for every deck

This means the current admitted in-repo corpus does not yet exercise line spacing in a meaningful closure-grade way.

### Per-class result summary

| Corpus class proxy | Inputs examined | Line-spacing evidence quality now | Observed current result |
| --- | --- | --- | --- |
| Clean reference | `simple-baseline`, `theme-inherited-text` | Low but useful for no-regression absence | No line-spacing drift detected; no line-spacing cleanup triggered |
| Mixed real-world | `mixed-font-drift`, `mixed-run-paragraph`, `bullet-heavy-list`, `bullet-nested-structure`, `bullet-symbol-drift`, `bullet-indent-jump-drift`, `alignment-body-style-drift` | Not meaningful for line spacing today | No line-spacing drift detected; no line-spacing cleanup triggered |
| Edge-case / unsafe-case | `template-placeholders`, `placeholder-template-dense`, `field-node-mixed`, `grouped-shapes-mixed`, `slide-master-variation` | Not meaningful for line spacing today | No line-spacing drift detected; no line-spacing cleanup triggered |
| Hostile stress-test | no admitted manifest deck | Missing official evidence | No official hostile line-spacing proof exists in the corpus today |

### Supplemental hostile signal

Observed from [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json):

- `lineSpacingDriftBefore = 8`
- `lineSpacingDriftAfter = 6`
- `lineSpacingFix` changed `2` paragraphs

This is useful as diagnosis-only pressure evidence because the generated hostile artifact has not been formally admitted to the acceptance corpus.

## Exact line-spacing failure modes observed

### 1. The official corpus currently never exercises line spacing

Observed directly from the manifest-wide audit + cleanup run:

- no admitted deck enters the line-spacing category with nonzero drift
- no admitted deck proves reduction
- no admitted deck produces hostile residual line-spacing evidence

This is the primary truth blocker for closure.

### 2. Detection is explicit-only

Observed from [packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts) and validated by [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts):

- inherited/default line spacing without explicit `a:lnSpc` is not counted as drift
- mixed inherited and explicit groups are not bridged into forced normalization

### 3. `lineSpacingFix` is a narrow local repair only

Observed from [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts):

- isolated middle outliers reduce safely
- ambiguous all-different explicit groups stay unchanged
- mixed unit forms stay unchanged
- titles stay unchanged

This is correct safety behavior, but it leaves wider line-spacing drift patterns unclosed.

### 4. Mixed unit forms are intentionally blocked

Observed from [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts) and [packages/audit/cleanupCandidateAudit.ts](../../packages/audit/cleanupCandidateAudit.ts):

- `spcPts` vs `spcPct` mismatch is detected
- the cleanup path intentionally skips forced normalization across kinds

### 5. Dominant-body-style line spacing can reduce eligible drift, but only in fixtures today

Observed from [tests/dominantBodyStyleFix.test.ts](../../tests/dominantBodyStyleFix.test.ts) and confirmed by the synthetic verification run:

- a body group with explicit `140%` line spacing was reduced to the dominant `120%`
- `verification.lineSpacingDriftBefore` reduced `2 -> 0`
- `issueCategorySummary` reported `line_spacing` as `improved`
- `deckReadinessSummary` reported `ready`
- `reportConsistencySummary` remained `consistent`

This is evidence that the reporting layer is internally coherent for this path, but it is still not corpus-grade proof because the current admitted corpus never exercises it.

### 6. Hostile residual drift still survives cleanup

Observed from [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json):

- residual hostile line-spacing drift remained after cleanup: `8 -> 6`
- current cleanup did not close all hostile drift even in supplemental generated signal

### 7. Unsafe and ambiguous boundaries remain unproven by corpus

Observed from current tests plus the zero-signal corpus run:

- title/body differences are intentionally preserved
- inherited/default cases are intentionally preserved
- mixed unit forms are intentionally preserved
- template-heavy, grouped-shape, and field-node decks provide no current line-spacing proof at all

These boundaries are still safety-first, not closure-grade.

## Detection-only vs reduction examples

### Detection-only

- Ambiguous explicit groups with all-different values remain unchanged in [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts): `3 -> 3`.
- Mixed `spcPts` and `spcPct` groups remain unchanged in [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts): `1 -> 1`.
- Mixed inherited and explicit groups remain unchanged in [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts): `2 -> 2`.
- The supplemental hostile artifact still reports residual line spacing after cleanup: `8 -> 6`.

### Material reduction

- The isolated `spcPct` outlier in [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts) reduces `1 -> 0`.
- The isolated `spcPts` outlier in [tests/lineSpacingFix.test.ts](../../tests/lineSpacingFix.test.ts) reduces `1 -> 0`.
- The synthetic dominant-body-style verification run reduces explicit body-group line spacing `2 -> 0` and reports `line_spacing` as `improved`.

### Important truth boundary

Fixture-level reduction exists, but admitted corpus reduction does not.

That means current tooling proves narrow safe behavior, not line-spacing closure across the acceptance corpus.

## Stability vs instability

### Stable behavior now

- `lineSpacingFix` is deterministic and idempotent on its narrow safe pattern.
- Title/body line-spacing asymmetry is preserved.
- Mixed unit forms are skipped rather than forced.
- Inherited/default line spacing is skipped rather than bridged.
- The current synthetic dominant-body-style line-spacing path reports improvement consistently when explicit eligible drift exists.

### Unstable or incomplete behavior now

- Official corpus-backed evidence is absent.
- Hostile stress evidence is supplemental only.
- Wider drift patterns beyond the isolated outlier case are not proven closed.
- Unsafe-case decks are present in inventory but do not currently provide line-spacing evidence.
- Current closure truth depends on fixtures and generated local artifacts more than on admitted corpus decks.

## Unsafe-case and ambiguity boundaries that must remain excluded

The following must remain outside forced normalization until a later sprint proves them safe:

- title shapes
- inherited/default line spacing with no explicit `a:lnSpc`
- mixed `spcPts` vs `spcPct` groups
- ambiguous all-different explicit local groups
- template-heavy placeholder semantics not proven by admitted line-spacing evidence
- grouped-shape and field-node cases that the current corpus does not measure meaningfully

## Readiness and report truth check

### What is consistent today

The current reporting layer is internally consistent on the line-spacing fixture paths that were exercised:

- isolated local line-spacing fixes report `line_spacing` as `improved`
- the synthetic dominant-body-style line-spacing fixture reports `detectedBefore: 2`, `fixed: 2`, `remaining: 0`, `status: "improved"`
- the same synthetic fixture reports `readinessLabel: "ready"` and `consistencyLabel: "consistent"`

### What is not honest to claim today

It would still be untruthful to say line spacing is corpus-proven or closure-grade because:

- official manifest-backed decks all report `line_spacing` as `clean` only because no line-spacing drift is exercised
- the hostile generated artifact still has residual drift after cleanup
- no admitted hostile or mixed real-world deck currently proves meaningful line-spacing reduction

### Current truthful baseline statement

Line spacing remains `Unproven`.

Current evidence supports only this narrower statement:

- line spacing has deterministic narrow fixture-level reduction on eligible explicit cases
- reporting is coherent on the exercised line-spacing paths
- the official corpus still does not provide closure-grade line-spacing proof

## Explicit closure blockers

- No admitted corpus deck currently produces nonzero `lineSpacingDriftBefore`.
- No admitted corpus deck currently produces nonzero `lineSpacingChanges`.
- No admitted corpus deck currently proves dominant-body-style line-spacing reduction.
- No admitted hostile stress deck currently exists for official line-spacing proof.
- Supplemental hostile evidence still shows residual drift after cleanup.
- Current safe cleanup is intentionally narrow and leaves mixed-kind, inherited, title, and ambiguous groups unresolved.

## Recommended M20.2 implementation targets

M20.2 should solve the smallest set of blockers needed to move line spacing from `Unproven` toward credibly improved:

- add or admit at least one official corpus input that contains eligible line-spacing drift and can prove reduction truthfully
- preserve current safety boundaries for titles, inherited/default spacing, mixed unit kinds, and ambiguous groups
- materially reduce at least one admitted eligible line-spacing case on the official corpus
- ensure hostile or unsafe decks remain truthful when residual drift survives
- avoid widening into paragraph-spacing normalization or generic typography redesign

## Test and tooling gaps discovered during diagnosis

- The admitted corpus has no dedicated line-spacing stress input today.
- The current acceptance inventory does not yet separate line-spacing-capable decks from line-spacing-neutral decks.
- Supplemental generated hostile artifacts provide useful pressure signal but are not admissible proof until formally admitted under [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).

## M20.1 boundary

This sprint diagnoses line spacing only.

It does not:

- implement line-spacing normalization fixes
- implement paragraph-spacing work
- redefine readiness scoring
- widen product claims
- start M20.2
