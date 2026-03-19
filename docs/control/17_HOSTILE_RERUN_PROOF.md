# CleanDeck - Hostile Re-Run Proof

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It defines the official Phase 2 / M21.1 hostile re-run proof artifact for the current engine state.
- It does not define M21.2 eligibility boundaries, readiness scoring redesign, or new cleanup implementation work.

## Purpose

This artifact records the current hostile-deck re-run evidence against the current engine.

It exists to answer:

- which hostile inputs were actually re-run
- what before/after evidence was measured by category
- which categories materially improve on hostile input
- which categories remain partial, weak, unsafe, or not closure-grade
- whether hostile-deck readiness and report outputs remain truthful
- what still blocks honest MVP proof before M21.2 boundary work begins

## Hostile input status

No officially admitted hostile stress deck currently exists in [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json).

That means this sprint can only produce supplemental hostile proof, not final hostile corpus closure proof.

The current in-repo hostile input used here was:

- [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx)

Related prior evidence artifact reviewed for context:

- [testdata/generated/cleandeck-chaos-deck-fixed.report.json](../../testdata/generated/cleandeck-chaos-deck-fixed.report.json)
- [scripts/generateChaosDeck.ts](../../scripts/generateChaosDeck.ts)

## What was re-run

The hostile deck was re-run through the current engine with:

- current audit surface from [packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts)
- current cleanup pipeline from [packages/fix/runAllFixes.ts](../../packages/fix/runAllFixes.ts)
- current readiness and consistency summaries from:
  - [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts)
  - [packages/fix/reportConsistencySummary.ts](../../packages/fix/reportConsistencySummary.ts)

The re-run used a temporary output path only. No hostile proof output was committed as a new corpus asset in this sprint.

## Exact hostile input used

| Input | Status | Why it was used |
| --- | --- | --- |
| [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx) | generated hostile candidate, not admitted corpus | it is the current in-repo all-category chaos deck and the only hostile input that intentionally stresses the six MVP cleanup classes together |

## Measured before/after evidence by category

Re-run result on [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx):

| Category | Before | After | Fixed | Current hostile verdict | Why this verdict is honest now |
| --- | --- | --- | --- | --- | --- |
| font normalization | 12 | 0 | 12 | materially improved | hostile input reached full drift reduction on this run |
| size normalization | 28 | 12 | 16 | partially improved | meaningful reduction occurred, but substantial hostile residual drift remains |
| alignment cleanup | 4 | 2 | 2 | partially improved | alignment improved, but hostile residual alignment drift remains |
| bullet / indent cleanup | 4 | 0 | 4 | materially improved | hostile bullet drift reached zero on this run |
| line spacing cleanup | 8 | 6 | 2 | partially improved | reduction occurred, but most hostile line-spacing drift remained |
| paragraph spacing cleanup | 12 | 6 | 6 | partially improved | reduction occurred, but half the hostile paragraph-spacing drift remained |

## Measured report output

The current hostile re-run produced these category summaries:

| Report category | detectedBefore | fixed | remaining | status |
| --- | --- | --- | --- | --- |
| `font_consistency` | 12 | 12 | 0 | `improved` |
| `font_size_consistency` | 28 | 16 | 12 | `improved` |
| `paragraph_spacing` | 12 | 6 | 6 | `improved` |
| `bullet_indentation` | 4 | 4 | 0 | `improved` |
| `alignment` | 4 | 2 | 2 | `improved` |
| `line_spacing` | 8 | 2 | 6 | `improved` |

## Hostile readiness and report-truth check

Current hostile re-run output:

- `readinessLabel: manualReviewRecommended`
- `readinessReason: manualActionStillNeeded`
- `consistencyLabel: consistent`
- `cleanupOutcomeSummary.summaryLine: Cleanup applied successfully, but some formatting drift remains.`
- `recommendedActionSummary.primaryAction: manual_attention`

This is truthful under [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md) because:

- multiple hostile categories still retain residual drift after cleanup
- the run does not falsely claim `ready`
- the report does not confuse visible improvement with category closure
- the report keeps improved categories visible while still surfacing remaining manual attention

## Slide-level hostile change distribution

Measured `changesBySlide` summary from the hostile re-run:

- slides `1` and `7`: font-family, font-size, and paragraph-spacing reduction
- slides `2` and `8`: bullet / indent reduction
- slides `3` and `9`: font-size and paragraph-spacing reduction
- slides `4` and `10`: font-family and line-spacing reduction
- slides `5` and `11`: font-family and font-size reduction
- slides `6` and `12`: font-size and alignment reduction

This pattern is consistent with the hostile generator in [scripts/generateChaosDeck.ts](../../scripts/generateChaosDeck.ts), which rotates six stress patterns across twelve slides.

## What has materially improved versus what still blocks honest MVP proof

### Materially improved on this hostile input

- font normalization
- bullet / indent cleanup

These categories reached zero remaining hostile drift on this specific re-run.

### Partially improved on this hostile input

- size normalization
- alignment cleanup
- line spacing cleanup
- paragraph spacing cleanup

These categories showed real reduction, but not hostile closure on this re-run.

### Still blocked for honest MVP proof

- hostile proof is still based on a generated candidate, not an admitted hostile corpus deck
- size, alignment, line spacing, and paragraph spacing still retain hostile residual drift
- one hostile re-run does not define the eligible vs ineligible boundary yet
- this sprint does not prove that hostile improvement is safe and closure-grade across more than one hostile input

## Key remaining blockers for honest MVP proof

- formally admitted hostile stress inputs are still missing from the official corpus inventory
- hostile re-run evidence still shows residual drift in four of the six core categories
- the current hostile result supports `manualReviewRecommended`, not `ready`
- M21.2 still needs to define which hostile or chaotic behaviors are legitimately in-scope for reliable cleanup versus report-only or boundary handling

## What this sprint does not prove yet

This sprint does not prove:

- that hostile closure is complete across all six categories
- that the current generated hostile deck is already an admitted acceptance-grade hostile corpus deck
- that `ready` is truthful for hostile stress decks
- that the current engine has crossed the full MVP proof boundary
- that M21.2 eligibility-boundary work can be skipped

## Validation run

Commands used for M21.1 grounding:

- `node --test tests/corpusRegression.test.ts tests/deckReadinessSummary.test.ts tests/reportConsistencySummary.test.ts tests/pipelineStability.test.ts`
- inline re-run using [packages/fix/runAllFixes.ts](../../packages/fix/runAllFixes.ts) against [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx)

Measured hostile re-run output:

- `fontDriftBefore: 12`, `fontDriftAfter: 0`
- `fontSizeDriftBefore: 28`, `fontSizeDriftAfter: 12`
- `spacingDriftBefore: 12`, `spacingDriftAfter: 6`
- `bulletIndentDriftBefore: 4`, `bulletIndentDriftAfter: 0`
- `alignmentDriftBefore: 4`, `alignmentDriftAfter: 2`
- `lineSpacingDriftBefore: 8`, `lineSpacingDriftAfter: 6`
- `readinessLabel: manualReviewRecommended`
- `consistencyLabel: consistent`

## M21.1 boundary

This sprint records hostile re-run evidence only.

It does not:

- define M21.2 eligibility boundaries
- implement new cleanup fixes
- redesign readiness scoring
- widen product claims beyond the hostile evidence recorded here
- start M21.2 or later work
