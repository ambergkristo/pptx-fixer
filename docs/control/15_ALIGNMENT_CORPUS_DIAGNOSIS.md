# CleanDeck - Alignment Corpus Diagnosis

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It defines the official Phase 1 / M19.1 diagnosis artifact for current alignment behavior across the corpus and current tooling.
- It does not implement alignment normalization fixes, readiness scoring changes, or M19.2+ closure work.

## Purpose

This diagnosis records the current truth for alignment cleanup before any alignment normalization work starts.

It exists to answer:

- what the engine currently treats as alignment cleanup
- where alignment is detected only
- where alignment is materially reduced
- what evidence is missing across the corpus classes
- what M19.2 must solve before alignment can move beyond `Unproven`

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
- [packages/audit/cleanupCandidateAudit.ts](../../packages/audit/cleanupCandidateAudit.ts)
- [packages/audit/dominantStyleAudit.ts](../../packages/audit/dominantStyleAudit.ts)
- [packages/fix/alignmentFix.ts](../../packages/fix/alignmentFix.ts)
- [packages/fix/dominantBodyStyleFix.ts](../../packages/fix/dominantBodyStyleFix.ts)
- [packages/fix/runAllFixes.ts](../../packages/fix/runAllFixes.ts)
- [packages/fix/issueCategorySummary.ts](../../packages/fix/issueCategorySummary.ts)
- [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts)
- [packages/fix/reportConsistencySummary.ts](../../packages/fix/reportConsistencySummary.ts)

### Tests and runs used as evidence

- `node --test tests/alignmentFix.test.ts tests/dominantBodyStyleFix.test.ts tests/corpusRegression.test.ts`
- `$env:PPTX_FIXER_EXTENDED_CORPUS='1'; node --test tests/corpusRegression.test.ts`
- `node --test tests/deckReadinessSummary.test.ts tests/issueCategorySummary.test.ts tests/reportConsistencySummary.test.ts`
- manifest-wide audit + cleanup run across every deck in [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json)
- supplemental local-generated hostile signal from [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx) and [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json)

## What alignment cleanup currently covers in actual engine behavior

Current alignment behavior is narrower than the product label suggests.

It currently covers:

- explicit paragraph alignment stored in `a:pPr/@algn`
- non-title text shapes only
- within-shape paragraph alignment outliers when a local safe pattern exists
- body-group alignment normalization when a strict dominant body style exists and a body group is explicitly eligible

It does not currently cover:

- object position alignment
- shape movement, distribution, or layout geometry
- title alignment normalization
- inherited alignment with no explicit `a:pPr/@algn`
- cross-shape inconsistency as a first-class audited alignment drift category
- grouped-shape, placeholder, field-node, or template-heavy alignment semantics as a proven closure path

## Current detection and reduction model

### Detection-only path

[packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts) records `alignmentDrift` only when:

- a non-title text shape has at least two paragraphs with explicit alignment
- the explicit alignments differ inside that same shape

If every explicit alignment in a shape is unique, all explicit paragraphs in that shape are marked as drift.

This means the current audited alignment category is shape-local and explicit-only.

### Reduction path 1: `alignmentFix`

[packages/fix/alignmentFix.ts](../../packages/fix/alignmentFix.ts) only fixes the safe local pattern:

- at least three explicit paragraphs in one non-title text shape
- the current paragraph is a detected drift paragraph
- the previous and next paragraphs have the same alignment
- the current paragraph is the isolated outlier between them

This is a narrow paragraph-neighbor repair, not a general alignment normalization system.

### Reduction path 2: `dominantBodyStyleFix`

[packages/fix/dominantBodyStyleFix.ts](../../packages/fix/dominantBodyStyleFix.ts) can also rewrite alignment when:

- a strict dominant body alignment exists across body groups
- the target body group has uniform explicit alignment
- the group is a cleanup candidate under [packages/audit/cleanupCandidateAudit.ts](../../packages/audit/cleanupCandidateAudit.ts)
- the group is not structurally unsafe

This means alignment can be changed through the dominant-body-style path even when `alignmentDriftCount` is zero.

## Corpus classes examined

The current manifest is still an inventory file, not a formal corpus-class map. For M19.1 diagnosis, the following decks were used as the nearest current in-repo proxies only.

### Clean reference deck proxies

- `simple-baseline`
- `theme-inherited-text`

### Mixed real-world deck proxies

- `mixed-font-drift`
- `mixed-run-paragraph`
- `bullet-heavy-list`
- `bullet-nested-structure`

### Edge-case / unsafe-case deck proxies

- `template-placeholders`
- `placeholder-template-dense`
- `field-node-mixed`
- `grouped-shapes-mixed`
- `slide-master-variation`

### Not closure-grade for alignment

- `extended-multi-slide` is robustness-only inventory, not meaningful alignment proof by itself.

### Hostile stress-test class

- No officially admitted hostile stress deck is currently declared in the tracked manifest.
- [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx) exists as a local generated stress artifact, but [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md) explicitly says generated files are candidates only until formally admitted.
- Therefore hostile alignment evidence is currently supplemental only, not official acceptance-grade proof.

## Corpus results

### Official manifest-backed corpus result

Across all 12 tracked manifest decks examined by audit + cleanup:

- `alignmentDriftBefore = 0` for every deck
- `alignmentDriftAfter = 0` for every deck
- `alignmentChanges = 0` for every deck
- `dominantBodyStyleAlignmentChanges = 0` for every deck
- `alignmentEligibleGroups = 0` for every deck

This means the current admitted in-repo corpus does not yet exercise alignment in a meaningful closure-grade way.

### Per-class result summary

| Corpus class proxy | Inputs examined | Alignment evidence quality now | Observed current result |
| --- | --- | --- | --- |
| Clean reference | `simple-baseline`, `theme-inherited-text` | Low but useful for no-regression absence | No alignment drift detected; no alignment cleanup triggered |
| Mixed real-world | `mixed-font-drift`, `mixed-run-paragraph`, `bullet-heavy-list`, `bullet-nested-structure` | Not meaningful for alignment today | No alignment drift detected; no alignment cleanup triggered |
| Edge-case / unsafe-case | `template-placeholders`, `placeholder-template-dense`, `field-node-mixed`, `grouped-shapes-mixed`, `slide-master-variation` | Not meaningful for alignment today | No alignment drift detected; no alignment cleanup triggered |
| Hostile stress-test | no admitted manifest deck | Missing official evidence | No official hostile alignment proof exists in the corpus today |

## Exact alignment failure modes observed

### 1. Shape-local only detection

Observed from [packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts) and validated by [tests/alignmentFix.test.ts](../../tests/alignmentFix.test.ts):

- alignment drift is only counted inside a single comparable shape
- cross-shape disagreement is not counted by the audited alignment category

### 2. Explicit-only detection

Observed from [packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts) and validated by [tests/dominantBodyStyleFix.test.ts](../../tests/dominantBodyStyleFix.test.ts):

- inherited alignment without explicit `a:pPr/@algn` is not counted as alignment drift
- groups with mixed or missing explicit alignment signatures are not eligible for dominant-body-style alignment correction

### 3. Titles are intentionally excluded from cleanup

Observed from [packages/fix/alignmentFix.ts](../../packages/fix/alignmentFix.ts) and [tests/alignmentFix.test.ts](../../tests/alignmentFix.test.ts):

- title shapes are skipped
- intentional centered title above left-aligned body is preserved

This is correct safety behavior, but it also reduces the amount of alignment evidence collected by current tooling.

### 4. Narrow safe repair pattern in `alignmentFix`

Observed from [tests/alignmentFix.test.ts](../../tests/alignmentFix.test.ts):

- isolated middle outlier between matching neighbors is fixed
- ambiguous all-different groups are left unchanged
- only the safe local group is touched when multiple groups share a slide

### 5. Dominant-body-style alignment can change content without the alignment category noticing

Observed directly from current tooling and validated by [tests/dominantBodyStyleFix.test.ts](../../tests/dominantBodyStyleFix.test.ts):

- a body group can be rewritten from center to left through `dominantBodyStyleFix`
- `verification.alignmentDriftBefore` can still remain `0`
- `issueCategorySummary` can still report alignment as `clean`

This is a current reporting gap, not proof of alignment closure.

### 6. Structurally risky groups remain ineligible

Observed from [packages/audit/cleanupCandidateAudit.ts](../../packages/audit/cleanupCandidateAudit.ts):

- bullet-bearing body groups are marked `structurally_unsafe_body_group`
- groups with mixed or ambiguous signatures are ineligible
- groups with no strict dominant body style are ineligible
- line-spacing kind mismatch can also block a body group even if alignment differs

### 7. Hostile supplemental signal shows only partial reduction

Observed from [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json):

- supplemental hostile drift reduced from `4` to `2`
- `alignmentFix` changed `2` paragraphs
- residual alignment drift remained after cleanup

Because this deck is not yet admitted to the official corpus, it supports diagnosis only, not closure proof.

## Detection-only vs reduction examples

### Detection-only

- Ambiguous mixed alignment groups with no safe local majority remain unchanged in [tests/alignmentFix.test.ts](../../tests/alignmentFix.test.ts).
- The supplemental chaos deck still reports alignment drift after cleanup: `4 -> 2`.
- Current manifest decks provide no alignment detection at all, so they also provide no reduction evidence.

### Material reduction

- The isolated center outlier in [tests/alignmentFix.test.ts](../../tests/alignmentFix.test.ts) reduces `alignmentDriftBefore: 1` to `alignmentDriftAfter: 0`.
- The dominant-body-style fixture in [tests/dominantBodyStyleFix.test.ts](../../tests/dominantBodyStyleFix.test.ts) rewrites a full body group's alignment safely.

### Important asymmetry

The dominant-body-style path can materially reduce alignment even when the audited alignment category never records the problem.

That means current tooling has both of these mismatches:

- some alignment problems are detected but not reduced
- some alignment reductions occur without being counted by the alignment category

## Stability vs instability

### Stable behavior now

- `alignmentFix` is deterministic and idempotent on its narrow safe pattern.
- Title/body asymmetry is preserved.
- Ambiguous mixed groups are skipped rather than forced.
- Corpus regression passes across all tracked decks, including extended inventory, without package corruption.

### Unstable or incomplete behavior now

- Official corpus coverage for alignment is effectively absent.
- The audited alignment category is narrower than actual alignment-changing behavior.
- Reported alignment status is not a reliable proxy for all alignment normalization behavior.
- Hostile stress evidence is not yet admitted to the official corpus.

## Readiness and report truth check

Current readiness/report outcomes are only partially consistent with alignment truth.

What is consistent:

- decks with zero remaining audited issues can be labeled `ready` or `mostlyReady` at deck level
- current report summaries do not claim alignment closure directly

What is not sufficient:

- [packages/fix/runAllFixes.ts](../../packages/fix/runAllFixes.ts) does not include corpus class or eligibility status in the runtime report payload
- [packages/fix/issueCategorySummary.ts](../../packages/fix/issueCategorySummary.ts) derives alignment status only from `alignmentDriftBefore` and `alignmentDriftAfter`
- [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts) classifies readiness from remaining-issue severity and improvement signals, not from corpus-class truth

Practical consequence:

- a deck can be reported as `ready` while the corpus still provides no meaningful alignment evidence
- a deck can also show alignment cleanup through dominant-body-style changes while the alignment issue category remains `clean`

That is acceptable only as deck-level runtime behavior under [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md). It is not acceptable as alignment-proof messaging.

## Honest current baseline statement for alignment

Alignment remains `Unproven`.

The current engine has:

- a real but narrow `alignmentFix`
- a broader dominant-body-style path that can also alter alignment safely in some body-group cases
- passing fixture tests for those narrow behaviors

But the current official corpus does not meaningfully exercise alignment across clean, mixed, hostile, and unsafe classes, and the current report category does not fully describe all alignment-changing behavior.

## Explicit closure blockers

- No officially admitted hostile stress deck currently supplies alignment evidence.
- No tracked manifest deck currently reports alignment drift at all.
- No tracked manifest deck currently produces alignment changes at all.
- Current audit logic only measures shape-local explicit alignment drift.
- Current report category logic does not capture dominant-body-style alignment corrections.
- Current runtime report payload lacks corpus class and eligibility fields required for truthful interpretation under [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).

## Recommended M19.2 implementation targets

M19.2 should focus on the smallest safe changes that directly address the blockers above:

1. Expand alignment diagnosis and reduction so official corpus decks actually exercise alignment meaningfully.
2. Decide whether cross-shape body-group alignment differences belong in the audited alignment category, the dominant-body-style category, or both, and then make that boundary explicit in code and reporting.
3. Preserve current safety rules for titles, ambiguous groups, and structurally unsafe groups.
4. Add truthful category accounting so alignment changes made through dominant-body-style cleanup are visible to alignment-proof reporting when appropriate.
5. Add or admit hostile and mixed corpus inputs that actually stress alignment.
6. Keep object-geometry movement out of scope unless the roadmap explicitly broadens alignment to layout movement later.

## Test and tooling gaps discovered

- The tracked manifest lacks an admitted hostile alignment deck.
- The tracked manifest lacks any admitted deck that currently produces `alignmentDriftBefore > 0`.
- There is no committed corpus-class map from manifest entries to official acceptance classes.
- There is no runtime report field for corpus class or eligibility status yet.
- There is no runtime report distinction between alignment reduced through `alignmentFix` vs alignment reduced through `dominantBodyStyleFix` at the category-truth level.

## M19.1 boundary

This sprint diagnoses alignment only.

This document does not start M19.2 and does not define:

- alignment normalization fixes
- cleanup-logic changes
- bullet or spacing closure work
- UI changes
- API/runtime product changes
- widened product claims

If diagnosis evidence and product messaging disagree, diagnosis evidence wins.
