# CleanDeck - Brand Drift Taxonomy

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It is aligned with the official eligibility boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It is aligned with the official controlled beta packaging in [19_CONTROLLED_BETA_PACKAGING.md](./19_CONTROLLED_BETA_PACKAGING.md).
- It is grounded in the current runtime category surfaces in [issueCategorySummary.ts](../../packages/fix/issueCategorySummary.ts), [categoryReductionReportingSummary.ts](../../packages/fix/categoryReductionReportingSummary.ts), and [deckReadinessSummary.ts](../../packages/fix/deckReadinessSummary.ts).
- This document defines the official Phase 3 / M22.1 brand-drift taxonomy.
- This document does not implement runtime reporting changes, new detection logic, cleanup logic, readiness redesign, or any M22.2+ work.

## Purpose

This taxonomy extends the current MVP cleanup categories into a broader compliance-oriented vocabulary for future Phase 3 work.

Its purpose is to give later reporting, compliance review, and boundary-definition work a stable language without implying that every taxonomy concept already exists in runtime evidence or shipping product behavior.

## Core taxonomy rule

Every taxonomy term must be classified into one of three truth states before it can be used in reporting or product messaging:

1. Currently runtime-evidenced
2. Currently boundary-evidenced only
3. Future taxonomy concept

If a term is not currently runtime-evidenced, it must not be presented as if CleanDeck already detects, fixes, or proves it in production reporting.

## Top-level brand-drift categories

### 1. Text style consistency drift

Covers style variation inside comparable text where the current product already has direct MVP evidence.

Subcategories:

- font family drift
- font size drift

Current runtime evidence:

- direct runtime evidence exists through the current font normalization and size normalization issue categories

Future-facing examples:

- weight/emphasis drift
- non-approved font pairing drift
- tone-specific type treatment drift

### 2. Text block structure drift

Covers inconsistency in how text blocks are aligned and structured as lists.

Subcategories:

- paragraph alignment drift
- bullet/list marker drift
- bullet depth/indent drift

Current runtime evidence:

- direct runtime evidence exists for alignment cleanup
- direct runtime evidence exists for bullet symbol and bullet indent cleanup

Future-facing examples:

- list semantics drift
- heading/body misuse
- hierarchy misuse within structured content blocks

### 3. Rhythm and spacing drift

Covers spacing inconsistency inside comparable text flows.

Subcategories:

- line spacing drift
- paragraph spacing drift

Current runtime evidence:

- direct runtime evidence exists for line spacing cleanup
- direct runtime evidence exists for paragraph spacing cleanup

Future-facing examples:

- section rhythm drift
- cadence drift across repeated content modules
- brand spacing-system drift beyond current safe normalization scope

### 4. Template and semantic structure drift

Covers template-linked structure risk that currently matters for boundary truth and future compliance work, but is not yet broad cleanup proof.

Subcategories:

- placeholder misuse
- master/layout deviation
- grouped-shape structure risk
- field-node-sensitive structure

Current runtime evidence:

- boundary evidence only
- current product truth already treats many such decks as manual-review or ineligible risk zones rather than reliable cleanup targets

Future-facing examples:

- template slot compliance
- semantic layout conformance
- section-role conformance

### 5. Brand system compliance drift

Covers higher-order compliance categories that will later unify cleanup, template, and policy truth.

Subcategories:

- approved typography compliance
- spacing-system compliance
- hierarchy compliance
- template conformance

Current runtime evidence:

- partial vocabulary only
- no broad runtime proof currently exists for this category as a complete compliance layer

This category is future-facing and must not be marketed as already implemented runtime capability.

### 6. Boundary and safety classification

This is not a direct drift-to-fix class. It is the taxonomy layer that records whether cleanup truth is eligible, manual-review, or report-only by boundary conditions.

Subcategories:

- eligible cleanup boundary
- manual-review boundary
- report-only / ineligible boundary
- hostile pressure evidence

Current runtime evidence:

- partial runtime evidence exists through readiness, category-reduction reporting, hostile proof, and current boundary control docs
- runtime does not yet expose a dedicated `report-only / ineligible` label

## Mapping from current MVP cleanup categories into the taxonomy

| Current MVP category | Brand-drift taxonomy category | Taxonomy subcategory | Current truth state |
| --- | --- | --- | --- |
| font normalization | Text style consistency drift | font family drift | currently runtime-evidenced |
| size normalization | Text style consistency drift | font size drift | currently runtime-evidenced |
| alignment cleanup | Text block structure drift | paragraph alignment drift | currently runtime-evidenced |
| bullet / indent cleanup | Text block structure drift | bullet/list marker drift and bullet depth/indent drift | currently runtime-evidenced |
| line spacing cleanup | Rhythm and spacing drift | line spacing drift | currently runtime-evidenced |
| paragraph spacing cleanup | Rhythm and spacing drift | paragraph spacing drift | currently runtime-evidenced |

## What is currently evidenced vs future-facing

Currently runtime-evidenced:

- font family drift
- font size drift
- paragraph alignment drift
- bullet/list marker drift
- bullet depth/indent drift
- line spacing drift
- paragraph spacing drift
- readiness-linked boundary truth at the current `ready`, `mostlyReady`, and `manualReviewRecommended` level
- category reduction truth at the current per-deck runtime summary level

Currently boundary-evidenced only:

- placeholder-heavy deck risk
- master/layout-sensitive deck risk
- grouped-shape structural risk
- hostile deck pressure as boundary evidence rather than broad cleanup success
- report-only / ineligible as a control-truth concept without a dedicated runtime label

Future taxonomy concepts:

- full brand system compliance drift
- template conformance reporting
- semantic layout conformance
- richer hierarchy compliance
- policy-grade brand drift rollups

These future taxonomy concepts must not be described as current runtime detection or cleanup capability.

## How this supports later compliance-oriented reporting

This taxonomy gives later Phase 3 work a clean vocabulary for describing:

- what is a direct style-cleanup issue
- what is a spacing or structure issue
- what is a template or semantic risk issue
- what is boundary truth rather than cleanup success
- what belongs to future compliance reporting instead of current runtime claims

It allows later reports to distinguish whether an issue is:

- currently measured and reduced
- currently measured but boundary-limited
- known only as a control-truth category
- future taxonomy only

## Examples of taxonomy usage on current known issue types

Example: body text uses the wrong font family inside an otherwise consistent deck.

- taxonomy category: Text style consistency drift
- subcategory: font family drift
- truth state: currently runtime-evidenced

Example: a comparable bullet list mixes symbol drift and indent jump drift.

- taxonomy category: Text block structure drift
- subcategories: bullet/list marker drift and bullet depth/indent drift
- truth state: currently runtime-evidenced

Example: a repeated body group contains line-height outliers that current cleanup safely reduces.

- taxonomy category: Rhythm and spacing drift
- subcategory: line spacing drift
- truth state: currently runtime-evidenced

Example: a placeholder-dense deck with master/layout-sensitive structure is unsafe for reliable cleanup.

- taxonomy category: Template and semantic structure drift
- subcategory: placeholder misuse or master/layout deviation
- truth state: boundary evidence only

Example: the hostile chaos deck shows multiple categories improving only partially and still forcing manual review.

- taxonomy categories: Text style consistency drift, Text block structure drift, Rhythm and spacing drift, Boundary and safety classification
- truth state: partial hostile evidence only, not broad readiness proof

## Controlled vocabulary rules

Future docs and reporting proposals must say whether a term is:

- currently runtime-evidenced
- currently boundary-evidenced only
- future taxonomy concept

No taxonomy term may imply runtime implementation by name alone.

No compliance-oriented wording may convert a future taxonomy concept into current product truth without new proof work.

## What this sprint does not prove yet

This sprint does not prove that:

- runtime already detects every top-level taxonomy category
- runtime already exposes a compliance-oriented report layer
- template or semantic structure drift is broadly normalized
- report-only / ineligible is already a dedicated runtime label
- brand system compliance reporting is already implemented
- Phase 3 reporting may skip future proof work

## M22.1 boundary

This sprint defines taxonomy only.

It does not start M22.2.

It does not implement new detection, cleanup logic, report runtime changes, readiness redesign, template enforcement, fingerprinting, or AI positioning.

If future taxonomy wording conflicts with current runtime evidence, the current runtime evidence and control-truth docs remain authoritative.
