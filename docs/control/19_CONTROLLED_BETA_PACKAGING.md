# CleanDeck - Controlled Beta Packaging

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It is aligned with the official eligibility boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It is grounded in the current runtime category reduction reporting and hardened readiness gate in:
  - [packages/fix/categoryReductionReportingSummary.ts](../../packages/fix/categoryReductionReportingSummary.ts)
  - [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts)
- It defines the official Phase 2 / M21.5 controlled-beta package for truthful pilot framing.
- It does not implement beta runtime controls, cleanup fixes, readiness redesign, or Phase 3+ work.

## Purpose

This artifact freezes the honest controlled-beta package so pilot use is framed by:

- truthful product positioning
- explicit deck-scope constraints
- truthful interpretation of runtime labels and reports
- clear pilot evaluation rules
- explicit statement of what the beta does not prove yet

## Current truthful product positioning

CleanDeck is currently:

- an audit-first deck QA tool
- with safe partial normalization for existing `.pptx` files
- that preserves structure and editability on current proven-safe paths
- and produces a corrected PPTX plus deterministic report

CleanDeck is not currently:

- a finished strict cleanup engine
- a template enforcement platform
- an AI deck post-processing layer
- a broad "all decks become ready" cleanup product

## Controlled beta package statement

The controlled beta is an explicitly constrained pilot for:

- users who can supply existing `.pptx` decks for audit and safe partial cleanup
- decks that are likely to fall inside the current eligible-cleanup boundary
- evaluation of whether current report output and corrected PPTX are useful enough for limited real pilot use

The controlled beta is not a broad market-ready launch.

It is a truth-constrained pilot package whose value proposition is:

- "audit existing decks"
- "apply safe partial normalization where confidence is high"
- "show category-by-category reduction honestly"
- "surface residual risk instead of hiding it"

## Which decks are appropriate for the controlled beta

Appropriate beta inputs are decks that are currently compatible with the eligible-cleanup boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).

In practice, the best current beta candidates are decks with:

- explicit, measurable formatting drift
- limited structural ambiguity
- no dependence on grouped-shape, field-node, placeholder, or master/layout semantics for the claimed cleanup success
- category patterns already supported by admitted corpus proof

Current repo-aligned examples of appropriate beta patterns:

- font-family and font-size inconsistency in ordinary body text
- explicit alignment outliers in otherwise coherent body-text groups
- explicit bullet-symbol or bullet-indent outliers in proven-safe list structures
- explicit line-spacing and paragraph-spacing drift in the currently proven-safe local or dominant-body-style patterns

Current repo examples that best represent this trustworthy beta path:

- `alignment-body-style-drift`
- `bullet-symbol-drift`
- `bullet-indent-jump-drift`
- `line-spacing-combined-drift`
- `paragraph-spacing-combined-drift`
- `simple-baseline`

## Which decks are not appropriate for the controlled beta

The controlled beta is not appropriate for decks whose main cleanup story would rely on:

- broad hostile all-category chaos
- grouped-shape normalization claims
- field-node-sensitive cleanup claims
- placeholder- or template-heavy semantics that current proof does not treat as reliable cleanup scope
- master/layout behavior that would require structural reinterpretation
- ambiguous or inherited styling where the current audit cannot justify deterministic correction safely

Current repo examples that should not be treated as trustworthy controlled-beta cleanup success candidates:

- `grouped-shapes-mixed`
- `field-node-mixed`
- `template-placeholders`
- `placeholder-template-dense`
- `slide-master-variation`

The generated hostile deck in [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx) is also not a broad beta-ready success template. It is useful pressure evidence, not a proof that concentrated all-category stress decks are now reliable cleanup targets.

## What the current runtime labels and report outputs do and do not mean

### Runtime labels currently available

The current runtime readiness labels are:

- `ready`
- `mostlyReady`
- `manualReviewRecommended`

The runtime does not currently expose a dedicated `report-only / ineligible` label.

### What `ready` currently means

`ready` currently means:

- the deck stayed on the current eligible-cleanup boundary
- no remaining formatting issues were detected after cleanup
- the current runtime report can distinguish category reduction truth from closure claims

`ready` does not currently mean:

- engine closure across all six categories
- hostile proof is complete
- every deck in the same broad class is now safe to trust
- report-only / ineligible cases are solved

### What `mostlyReady` currently means

`mostlyReady` currently means:

- the deck remained inside the current eligible-cleanup boundary
- low residual drift remains
- meaningful category reduction is visible
- the result is still deck-specific and not closure proof

`mostlyReady` does not currently mean:

- "nearly solved everywhere"
- hostile-grade proof
- permission to widen MVP claims by itself

### What `manualReviewRecommended` currently means

`manualReviewRecommended` currently means:

- manual review is still required after cleanup
- the deck falls outside current trustworthy ready-path behavior
- residual risk, unresolved drift, or boundary pressure still dominates the outcome

It may still include meaningful partial cleanup. It must not be interpreted as total engine failure.

### What category reduction reporting currently means

The runtime category reduction surface currently exposes:

- `detectedBefore`
- `fixed`
- `remaining`
- `status`

And the additional category-reduction truth surface now exposes:

- `resolvedCategories`
- `partiallyReducedCategories`
- `unchangedCategories`
- `cleanCategories`
- `deckBoundary`
- `claimScope: deckSpecificReductionOnly`
- `closureClaimBlocked: true`
- `runtimeReportOnlyLabelAvailable: false`

This means the beta may truthfully show what improved on this deck. It may not use category reduction alone as proof that category closure or broad production readiness is complete.

## What beta users may trust

Beta users may currently trust that CleanDeck can:

- audit existing `.pptx` files deterministically
- produce a corrected PPTX when safe cleanup is available
- preserve structure and editability on current proven-safe paths
- report category-level before/after reduction honestly
- surface residual risk rather than hiding it behind optimistic wording
- keep hostile partial improvement separated from deck-level readiness trust

## What beta users must still manually review

Beta users must still manually review:

- decks that end in `manualReviewRecommended`
- decks with material residual drift after cleanup
- decks whose important formatting story depends on structural semantics outside current safe proof
- decks that look visibly better but still sit outside trustworthy ready-path behavior
- any deck where current product truth would otherwise require `report-only / ineligible`, even though that exact runtime label is not yet exposed

## How hostile evidence constrains the beta package

The hostile re-run in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md) is a hard limit on beta messaging.

Current hostile result:

- materially improved: font normalization, bullet / indent cleanup
- partially improved: size normalization, alignment cleanup, line spacing cleanup, paragraph spacing cleanup
- hostile runtime outcome: `manualReviewRecommended`

Therefore the controlled beta must not claim:

- broad hostile-readiness trust
- that concentrated all-category chaos decks are beta-safe ready-path inputs
- that partial hostile improvement is enough to market broad production readiness

## Pilot constraints and user expectations

The controlled beta should be framed to pilot users with these constraints:

- bring existing `.pptx` decks, not requests for redesign or deck generation
- prefer decks with explicit formatting drift rather than structural/template complexity
- expect safe partial normalization, not guaranteed full cleanup
- use the corrected PPTX plus report together
- treat manual-review outcomes as part of the intended truth boundary, not as a hidden failure mode
- avoid treating the current service as broad unattended production automation

Operationally, the beta must also remain constrained by current README realities:

- storage is local and temporary
- there is no authentication yet
- the current shell is suitable only for controlled beta testing

## What pilot evidence should be collected

The controlled beta should collect evidence that is useful for truth, not vanity.

Required pilot evidence includes:

- deck type and why it was considered eligible, manual-review-boundary, or boundary-risk input
- runtime readiness label distribution
- per-category reduction results:
  - detected before
  - fixed
  - remaining
  - status
- how often users judged the corrected PPTX as usable without structural damage
- how often manual review was still required
- where users felt the runtime label was too optimistic, too pessimistic, or correctly conservative
- whether any pilot deck should later be admitted as new corpus or hostile evidence

Useful qualitative evidence includes:

- whether report wording helped users understand what changed
- whether users could tell partial improvement from closure
- whether users understood when the product was declining to overclaim

## What would count as a successful controlled beta outcome

A successful controlled beta outcome would show all of the following:

- pilot users understand the current product truth and do not mistake it for a strict cleanup engine
- eligible decks repeatedly produce trustworthy corrected PPTX plus useful reports
- runtime labels are interpreted correctly and do not create false confidence
- manual-review outcomes are accepted as honest boundary behavior rather than confusing failure
- no major evidence emerges that the current report/readiness boundary is overstating cleanup trust
- the pilot yields concrete deck examples that sharpen the corpus and proof story for later work

## What would count as a failed or blocked beta outcome

The beta should be treated as failed or blocked if:

- users consistently interpret `ready` or `mostlyReady` as category closure
- pilot reality shows that currently "eligible" decks frequently behave like manual-review-boundary decks
- hostile or structurally risky decks are being treated as normal ready-path beta inputs
- the corrected PPTX repeatedly causes trust loss on decks the current proof surface should have handled safely
- product messaging pressure starts outrunning the actual corpus, hostile, boundary, and readiness evidence

## What this sprint does not prove yet

This sprint does not prove:

- that CleanDeck is production-ready beyond a controlled beta
- that hostile closure is complete
- that a dedicated runtime `report-only / ineligible` label already exists
- that current partial hostile improvement justifies broad market expansion
- that Phase 3 brand-drift work should begin early
- that the product is now a strict cleanup engine, template platform, or AI post-processing layer

## M21.5 boundary

This sprint freezes the controlled-beta package only.

It does not:

- implement cleanup fixes
- redesign readiness scoring in code
- add beta runtime controls or new product surfaces
- widen claims beyond current corpus, boundary, category-reduction, readiness, and hostile evidence
- start Phase 3

If pilot packaging and current proof disagree, current proof wins.
