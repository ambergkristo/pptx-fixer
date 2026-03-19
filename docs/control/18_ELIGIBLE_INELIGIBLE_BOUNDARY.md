# CleanDeck - Eligible vs Ineligible Deck Boundary

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It defines the official Phase 2 / M21.2 eligibility boundary for truthful cleanup scope.
- It does not implement report-only behavior in code, redesign readiness scoring, or start M21.3+ work.

## Purpose

This boundary exists so CleanDeck can honestly distinguish:

- decks that are in scope for trustworthy cleanup
- decks that are report-only / ineligible
- decks that remain processable but still require manual review after partial cleanup

This document is a product-truth boundary, not a promise that every boundary state is already exposed as a dedicated runtime label in code.

## Inputs used for this boundary

### Control inputs

- [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md)
- [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md)
- [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md)
- [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md)
- [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md)

### Repo inputs

- [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json)
- [testdata/corpus/README.md](../../testdata/corpus/README.md)
- [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts)
- [packages/fix/recommendedActionSummary.ts](../../packages/fix/recommendedActionSummary.ts)
- [packages/audit/cleanupCandidateAudit.ts](../../packages/audit/cleanupCandidateAudit.ts)

## Core boundary statement

CleanDeck can currently be trusted to do safe partial normalization on decks where the cleanup target is:

- explicit enough to measure deterministically
- comparable enough to normalize without inventing style intent
- structurally safe enough that cleanup does not rely on rewriting placeholders, grouped content, field ordering, or template semantics
- supported by current category evidence rather than by UI polish or one-off visible improvement

If a deck falls outside those conditions, current product truth must stop at either:

- `manual review after partial cleanup`
- or `report-only / ineligible`

## Eligible for reliable cleanup

A deck is currently eligible for reliable cleanup only when all of the following are true:

1. The deck is processable without breaking file validity, text fidelity, or editability.
2. The drift to be claimed is explicit and measurable in the current audit surface.
3. The cleanup target matches a currently proven safe pattern rather than requiring layout reinterpretation.
4. The deck does not depend on grouped-shape, field-node, placeholder, master/layout, or similar structural semantics to justify the claimed cleanup result.
5. The deck's expected truthful outcome is compatible with its corpus class under [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
6. The deck's result does not rely on treating partial hostile improvement as broad closure proof.

### Practical eligibility criteria

The current engine can be trusted most on decks where drift is primarily:

- explicit font-family drift
- explicit font-size drift
- explicit local alignment outliers
- explicit bullet-symbol or bullet-indent outliers in safe list structures
- explicit line-spacing drift in proven-safe local or dominant-body-style patterns
- explicit paragraph-spacing drift in proven-safe local or dominant-body-style patterns

The current engine can be trusted less, and should not be treated as broadly eligible, when the deck depends on:

- inherited or ambiguous style intent that the current audit cannot compare safely
- mixed line-spacing kinds that intentionally block normalization
- mixed or ambiguous signatures that the cleanup candidate logic marks as not eligible
- structural conditions where safe partial normalization may still leave significant residual drift

## Ineligible / report-only boundary

A deck is currently ineligible for reliable cleanup, and must be treated as report-only at the product-truth layer, when one or more of the following are true:

- the deck's important cleanup target is not explicit enough for deterministic correction
- cleanup would require forcing structure or semantics that current safety logic intentionally avoids
- the deck's main value is boundary evidence rather than trustworthy normalization success
- the deck is dominated by grouped-shape, field-node, placeholder, template-heavy, or master/layout risk that the current engine does not prove safe to normalize
- the deck's evidence would otherwise be mistaken for closure proof even though it is only diagnostic or boundary evidence

### Report-only criteria

Report-only / ineligible is the honest boundary when:

- the deck should still be audited
- the report should still surface issues and risk
- cleanup-closure success should not be promised for that deck
- any improvement observed must not be counted as proof of reliable cleanup scope

### Important runtime truth

The current code does not yet expose a dedicated `report-only / ineligible` readiness label.

Current runtime labels in [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts) are only:

- `ready`
- `mostlyReady`
- `manualReviewRecommended`

Therefore M21.2 defines the official product boundary now, while the exact runtime surfacing of `report-only / ineligible` remains later work.

## Manual-review boundary

A deck belongs in the manual-review boundary when it is still processable and may receive meaningful partial cleanup, but the current engine cannot honestly be trusted to deliver closure-grade cleanup on that deck.

This boundary applies when:

- meaningful reduction occurs, but material residual drift remains
- the deck is not safe to call `ready`
- the deck still benefits from cleanup, so treating it as pure report-only would be too pessimistic
- the truthful product claim is "safe partial normalization plus report", not broad reliable cleanup success

### Manual-review rules

- `manualReviewRecommended` is truthful when significant residual drift remains after cleanup.
- Manual-review status does not automatically mean the deck is ineligible for all cleanup.
- Manual-review status does mean the deck is outside current trustworthy ready-path behavior.
- Hostile candidate decks with only partial category reduction should stay in this bucket unless and until later evidence supports a narrower eligible claim.

## Examples by current repo evidence

| Boundary bucket | Current repo examples | Why this is the honest bucket now |
| --- | --- | --- |
| Eligible for reliable cleanup | `alignment-body-style-drift`, `bullet-symbol-drift`, `bullet-indent-jump-drift`, `line-spacing-combined-drift`, `paragraph-spacing-combined-drift`, `simple-baseline` | these inputs exercise explicit, deterministic, currently proven-safe patterns and have corpus-backed before/after proof |
| Manual review after partial cleanup | [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx), naturally messy mixed decks with residual drift after valid cleanup | current evidence shows meaningful partial improvement but not closure-grade trust across all exercised categories |
| Report-only / ineligible boundary evidence | `grouped-shapes-mixed`, `field-node-mixed`, `template-placeholders`, `placeholder-template-dense`, `slide-master-variation` | these inputs are primarily structural-risk or boundary-evidence cases and should not be used to imply reliable cleanup scope |

## How hostile evidence influences the boundary

The hostile re-run in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md) narrows the eligibility boundary in an important way.

Current hostile result:

- materially improved: font normalization, bullet / indent cleanup
- partially improved: size normalization, alignment cleanup, line spacing cleanup, paragraph spacing cleanup
- hostile outcome: `manualReviewRecommended`, not `ready`

This means:

- hostile all-category chaos decks cannot currently be treated as broadly eligible for trustworthy cleanup
- partial hostile improvement is real evidence of engine strength, but not evidence of broad deck-level eligibility
- current product claims must stop short of saying that concentrated all-category hostile decks are reliable cleanup targets
- the hostile class currently supports boundary pressure and proof of partial capability, not a broad eligible-deck promise

## What the current engine can honestly be trusted to do

Current honest trust boundary:

- audit existing PPTX files deterministically
- preserve structure and editability on admitted proof decks and current safe paths
- materially reduce several explicit formatting categories on eligible decks
- provide truthful manual-review outcomes when residual drift remains
- provide useful boundary evidence on unsafe or ineligible decks without forcing cleanup claims

Current honest trust boundary does not extend to:

- every hostile or chaotic deck
- grouped-shape, field-node, placeholder, or template-heavy semantics as reliable cleanup targets
- broad `ready` trust for decks with concentrated multi-category stress
- treating visible improvement as proof that a deck belongs inside the reliable-cleanup envelope

## What current product claims must stop at

Current product messaging may honestly say:

- CleanDeck provides safe partial normalization on eligible decks
- some decks are better handled as manual review after partial cleanup
- some decks should be treated as report-only / ineligible boundary cases

Current product messaging must not say:

- every processable deck is eligible for reliable cleanup
- hostile all-category chaos decks are trustworthy ready-path inputs
- partial hostile improvement proves broad deck eligibility
- current runtime readiness labels already fully expose the eligibility boundary in implementation

## What this sprint does not prove yet

This sprint does not prove:

- that the runtime report already exposes a dedicated `report-only / ineligible` label
- that all hostile decks can now be split automatically by code into eligible vs ineligible buckets
- that partial hostile improvement is enough to widen the MVP claim
- that M21.3 category reduction reporting can be skipped
- that M21.4 readiness hardening is already complete

## M21.2 boundary

This sprint defines the official eligibility boundary only.

It does not:

- implement cleanup fixes
- implement report-only behavior in code
- redesign readiness scoring logic
- start M21.3 category reduction reporting
- widen claims beyond the corpus, baseline, report-truth, and hostile evidence currently recorded
