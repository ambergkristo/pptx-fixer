# CleanDeck - Brand Drift Pilot

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It is aligned with the official eligibility boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It is aligned with the official controlled beta packaging in [19_CONTROLLED_BETA_PACKAGING.md](./19_CONTROLLED_BETA_PACKAGING.md).
- It is aligned with the official brand-drift taxonomy in [20_BRAND_DRIFT_TAXONOMY.md](./20_BRAND_DRIFT_TAXONOMY.md).
- It is grounded in the current runtime report surfaces in:
  - [packages/fix/complianceOrientedReportSummary.ts](../../packages/fix/complianceOrientedReportSummary.ts)
  - [packages/fix/brandScoreImprovementSummary.ts](../../packages/fix/brandScoreImprovementSummary.ts)
  - [packages/fix/multiDeckComplianceReviewSummary.ts](../../packages/fix/multiDeckComplianceReviewSummary.ts)
  - [packages/fix/categoryReductionReportingSummary.ts](../../packages/fix/categoryReductionReportingSummary.ts)
  - [packages/fix/deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts)
- It defines the official Phase 3 / M22.5 brand-drift pilot package.
- It does not implement new cleanup logic, new detection logic, readiness redesign in code, or any Phase 4+ work.

## Purpose

This artifact freezes the narrow, truthful brand-drift pilot package so CleanDeck can be piloted with brand/comms-heavy users without overstating:

- current runtime category coverage
- current boundary handling
- current score meaning
- current multi-deck review meaning
- current enterprise-readiness level

## Truthful pilot positioning

The brand-drift pilot is currently:

- a constrained pilot for governance-friendly reading of existing cleanup and audit evidence
- a pilot for teams that want clearer language around brand-drift signals already backed by runtime evidence
- a pilot for reviewing repeated deck audits together without pretending full org-wide compliance scoring exists

The brand-drift pilot is not currently:

- an enterprise brand compliance platform
- a full template conformance layer
- an org-wide benchmark or policy-scoring system
- proof that CleanDeck detects every category in the Phase 3 taxonomy

## Intended pilot user profiles

This pilot is appropriate for users who already understand that CleanDeck is:

- audit-first
- safe partial normalization only
- boundary-limited on template and semantic structure risk

Best-fit pilot users:

- brand operations leads reviewing recurring formatting drift across existing decks
- communications teams reviewing repeated deck outputs for consistency patterns
- design systems or enablement stakeholders who need deck-by-deck evidence, not automated policy enforcement
- pilot users comfortable with manual review on boundary or hostile-like decks

## Appropriate pilot deck types

The brand-drift pilot is appropriate for decks where the main review value comes from currently runtime-evidenced signals:

- text style consistency drift:
  - font family drift
  - font size drift
- text block structure drift:
  - paragraph alignment drift
  - bullet marker / indent drift
- rhythm and spacing drift:
  - line spacing drift
  - paragraph spacing drift

Practical in-scope pilot deck patterns:

- existing `.pptx` decks with explicit formatting drift in ordinary body text
- repeated decks that stay inside the current eligible-cleanup boundary
- deck sets where users want deck-level and multi-deck review of resolved, partially reduced, and unchanged runtime categories
- deck collections where the value comes from truthful review language, not automated template enforcement

Repo-aligned examples of appropriate pilot evidence inputs:

- `alignment-body-style-drift`
- `bullet-symbol-drift`
- `bullet-indent-jump-drift`
- `line-spacing-combined-drift`
- `paragraph-spacing-combined-drift`
- mixed eligible decks reviewed together through the multi-deck compliance review surface

## Excluded or unsafe pilot deck types

This pilot is not appropriate for decks whose value story would depend on future-only or boundary-only taxonomy coverage.

Excluded or unsafe pilot deck types include:

- grouped-shape-heavy decks
- field-node-sensitive decks
- placeholder-dense decks
- master/layout-sensitive decks
- decks whose main question is template conformance rather than current runtime-evidenced drift
- all-category hostile chaos decks as a broad trust model for pilot success

Current repo examples that must stay outside the trusted pilot scope:

- `grouped-shapes-mixed`
- `field-node-mixed`
- `template-placeholders`
- `placeholder-template-dense`
- `slide-master-variation`
- [testdata/generated/cleandeck-chaos-deck.pptx](../../testdata/generated/cleandeck-chaos-deck.pptx) as a broad pilot-ready success template

## What participants may trust in current brand-drift outputs

Pilot participants may currently trust that:

- the compliance-oriented layer translates current runtime evidence into taxonomy-aligned language
- the brand-score layer is already trust-hardened and does not claim full brand compliance scoring
- the multi-deck review surface keeps per-deck truth visible instead of hiding it behind one aggregate score
- `ready`, `mostlyReady`, and `manualReviewRecommended` remain deck-level readiness signals, not enterprise compliance proof
- current runtime-evidenced categories can be reviewed as:
  - resolved
  - partially reduced
  - unchanged
  - clean

## What participants must still treat as manual-review or boundary-limited

Pilot participants must still treat the following as boundary-limited:

- any deck on the `manualReviewBoundary`
- any deck ending in `manualReviewRecommended`
- any deck where improvement is visible but the brand-score interpretation is only `manualReviewConstrainedImprovement`
- any deck where the main concern is template or semantic structure drift
- any report concept currently surfaced as:
  - `currentlyBoundaryEvidencedOnly`
  - `futureTaxonomyOnly`
- `report-only / ineligible` as a control truth concept rather than a currently available runtime label

## What participants should evaluate

Pilot participants should evaluate:

- whether the current taxonomy wording is understandable and non-misleading
- whether deck-level runtime-evidenced categories are useful for brand/comms review
- whether the current brand-score interpretation reads conservatively enough
- whether multi-deck review helps repeated audit reading without hiding deck-level boundary truth
- whether participants can reliably distinguish:
  - runtime-evidenced signals
  - boundary-only signals
  - future taxonomy concepts
- whether current readiness and boundary language is too optimistic, too pessimistic, or correctly conservative

## What evidence the pilot must collect

Required pilot evidence should focus on truth and trust, not vanity.

The pilot should collect:

- pilot user role and why that role fit the narrow brand-drift pilot
- deck type and why the deck was considered in-scope, manual-review-boundary, or excluded
- distribution of deck outcomes across:
  - `ready`
  - `mostlyReady`
  - `manualReviewRecommended`
- distribution of deck boundaries across:
  - `eligibleCleanupBoundary`
  - `manualReviewBoundary`
- which runtime-evidenced taxonomy groups were actually useful to participants
- whether participants correctly understood future taxonomy concepts as not yet implemented runtime capability
- whether aggregate review caused any false confidence versus the underlying deck views
- whether brand-score interpretation was read as:
  - conservative and useful
  - somewhat confusing
  - too strong for current proof
- concrete examples of decks that should later:
  - enter the corpus
  - remain boundary evidence only
  - refine future compliance reporting language

## What would count as pilot success

A successful brand-drift pilot outcome would show all of the following:

- pilot users understand that the pilot is a runtime-evidence review layer, not full compliance scoring
- users find the taxonomy-aligned report layer useful on current runtime-evidenced categories
- users do not confuse `manualReviewBoundary` decks with trusted aggregate success
- multi-deck review helps repeated deck evaluation without hiding deck-level boundary truth
- participants can name which runtime signals are genuinely useful for brand/comms review
- pilot evidence identifies a credible, still-narrow next proof step for later Phase 3 work

## What would count as pilot failure or insufficient proof

Pilot failure or insufficient proof would include:

- pilot users repeatedly misread the surface as full enterprise brand compliance scoring
- users depend mainly on future-only taxonomy concepts that current runtime does not implement
- users require template conformance or semantic-structure enforcement to find the pilot useful
- aggregate review causes false confidence that overrides deck-level manual-review truth
- most candidate pilot decks behave like hostile or boundary-risk inputs rather than eligible review inputs
- the pilot yields little evidence that the taxonomy/report/aggregate layer adds value beyond current deck cleanup summaries

## What this sprint does not prove yet

This sprint does not prove:

- full org-wide brand compliance capability
- full template conformance detection or enforcement
- enterprise scoring or benchmark coverage
- runtime support for every Phase 3 taxonomy concept
- that a dedicated `report-only / ineligible` runtime label already exists
- that Phase 4 work can start without further proof

## M22.5 boundary

This sprint defines the brand-drift pilot package only.

It does not:

- implement cleanup fixes
- implement new detection logic
- redesign readiness scoring in code
- redesign report UI
- widen product claims beyond current cleanup and reporting evidence
- start Phase 4
