# CleanDeck - Deck Style Fingerprint Specification

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It is aligned with the official eligibility boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It is aligned with the official controlled beta packaging in [19_CONTROLLED_BETA_PACKAGING.md](./19_CONTROLLED_BETA_PACKAGING.md).
- It is aligned with the official brand-drift taxonomy in [20_BRAND_DRIFT_TAXONOMY.md](./20_BRAND_DRIFT_TAXONOMY.md).
- It is aligned with the official brand-drift pilot package in [21_BRAND_DRIFT_PILOT.md](./21_BRAND_DRIFT_PILOT.md).
- It is grounded in the current runtime evidence surfaces in:
  - [packages/audit/pptxAudit.ts](../../packages/audit/pptxAudit.ts)
  - [packages/audit/styleSignatureAudit.ts](../../packages/audit/styleSignatureAudit.ts)
  - [packages/audit/dominantStyleAudit.ts](../../packages/audit/dominantStyleAudit.ts)
  - [packages/fix/complianceOrientedReportSummary.ts](../../packages/fix/complianceOrientedReportSummary.ts)
  - [packages/fix/brandScoreImprovementSummary.ts](../../packages/fix/brandScoreImprovementSummary.ts)
  - [packages/fix/multiDeckComplianceReviewSummary.ts](../../packages/fix/multiDeckComplianceReviewSummary.ts)
- It defines the official Phase 4 / M23.1 deck-style fingerprint specification.
- It does not implement fingerprint extraction, template matching, cleanup logic, new detection logic, runtime report changes, or any M23.2+ work.

## Purpose

This specification defines the canonical deck-style fingerprint structure so future fingerprint extraction and template-intelligence work has:

- a stable schema
- explainable dimensions
- conservative truth boundaries
- explicit separation between current evidence, future targets, and out-of-scope concepts

The fingerprint must remain explainable. It must not become a magical hidden score or opaque template guess.

## Core fingerprint rule

Every fingerprint dimension must be labeled as one of:

1. `currently evidence-backed`
2. `future extraction target`
3. `explicitly out of scope`

If a dimension is not currently evidence-backed, it must not be presented as if CleanDeck already extracts it reliably in runtime.

## Canonical top-level fingerprint dimensions

### 1. Deck-level dominant style snapshot

Purpose:
- capture the narrow deck-level style baseline that current runtime can already summarize conservatively

Canonical fields:
- `fontFamily`
- `fontSize`
- `alignment`
- `lineSpacing`
- `spacingBefore`
- `spacingAfter`

Current truth state:
- `currently evidence-backed`

Current runtime grounding:
- this already exists in [DeckStyleFingerprint](../../packages/audit/pptxAudit.ts)

Explainability rule:
- every value must be explainable as either:
  - a safe dominant value currently derivable from runtime evidence
  - or `null` when no safe dominant value exists

### 2. Paragraph-group style signature set

Purpose:
- capture comparable local style signatures that make future extraction and normalization explainable at group level instead of only deck level

Canonical fields per group:
- `groupType`
- `paragraphCount`
- `startParagraphIndex`
- `endParagraphIndex`
- `fontFamily`
- `fontSize`
- `spacingBefore`
- `spacingAfter`
- `alignment`
- `lineSpacing`
- `bulletLevel`

Current truth state:
- `currently evidence-backed`

Current runtime grounding:
- current group signatures already exist in [styleSignatureAudit.ts](../../packages/audit/styleSignatureAudit.ts)
- current group mapping and paragraph ranges already exist in the audit output

Explainability rule:
- every group signature field must resolve from explicit comparable paragraph properties only
- mixed, inherited, or unsafe-to-compare values must collapse to `null` rather than guessed structure

### 3. Dominant body-style consensus

Purpose:
- capture the strict-majority body-text style that later work may use as a stable normalization or matching anchor

Canonical fields:
- `fontFamily`
- `fontSize`
- `spacingBefore`
- `spacingAfter`
- `alignment`
- `lineSpacing`

Current truth state:
- `currently evidence-backed`

Current runtime grounding:
- current body-style consensus already exists in [dominantStyleAudit.ts](../../packages/audit/dominantStyleAudit.ts)

Explainability rule:
- a field may be populated only when current strict-majority logic supports it
- ties, weak majorities, or mixed comparable signals must remain `null`

### 4. Usage-distribution evidence

Purpose:
- preserve the measurable histogram evidence behind style claims instead of exposing only final dominant values

Canonical fields:
- `fontFamilyHistogram`
- `fontSizeHistogram`
- `dominantFontFamilyCoverage`
- `dominantFontSizeCoverage`

Current truth state:
- `currently evidence-backed`

Current runtime grounding:
- current deck and slide font usage summaries already exist in [pptxAudit.ts](../../packages/audit/pptxAudit.ts)

Explainability rule:
- coverage values must be directly traceable to counted runtime observations
- no weighting, ranking, or latent scoring may be hidden inside this dimension

### 5. Drift and boundary context

Purpose:
- keep the fingerprint tied to truthful cleanup and governance context rather than pretending it is a pure style identity detached from risk

Canonical fields:
- `fontDriftSeverity`
- category-level reduction context
- deck boundary context
- readiness context
- manual-review requirement

Current truth state:
- `currently evidence-backed`

Current runtime grounding:
- `fontDriftSeverity` in [pptxAudit.ts](../../packages/audit/pptxAudit.ts)
- category reduction, readiness, compliance, and boundary views in current fix/report summaries

Explainability rule:
- this dimension must describe the truth boundary around the fingerprinted deck
- it must not be merged into a single hidden confidence score

### 6. Template-intelligence candidate layer

Purpose:
- reserve the future layer that later work may use for reliable template matching and controlled normalization experiments

Candidate future fields:
- repeated layout module signatures
- placeholder-role pattern signatures
- template slot similarity markers
- slide-family clustering traits
- cross-deck style family similarity markers

Current truth state:
- `future extraction target`

Explainability rule:
- these fields must not appear as implemented runtime capability until M23.2+ proves reliability

## Separation of evidence-backed, future, and out-of-scope dimensions

### Currently evidence-backed dimensions

- deck-level dominant style snapshot
- paragraph-group style signature set
- dominant body-style consensus
- usage-distribution evidence
- drift and boundary context

These are grounded in current runtime structures and may be used as the canonical base of the fingerprint spec.

### Future extraction targets

- repeated layout-module signatures
- placeholder-role patterns
- template slot similarity
- slide-family clustering
- template match confidence traits
- controlled normalization candidate anchors based on reliable fingerprint agreement

These belong to the future fingerprint roadmap but are not current runtime claims.

### Explicitly out-of-scope dimensions for now

- semantic narrative intent
- content meaning or messaging quality
- AI embedding-based style similarity
- brand voice or rhetorical tone
- org policy compliance scoring
- full template enforcement decisions
- enterprise benchmark rankings

These must stay outside the fingerprint spec as active runtime promises.

## Canonical explainability rules

For every fingerprint dimension:

1. The source fields must be named explicitly.
2. The derivation rule must be simple enough to explain in prose.
3. Ambiguous or mixed values must degrade to `null`, boundary markers, or future-only status rather than guessed output.
4. A fingerprint field must never imply template match confidence by itself.
5. A fingerprint field must never imply cleanup safety by itself.
6. A fingerprint must remain inspectable deck by deck and must not be hidden behind one opaque score.

## Mapping from current runtime surfaces into the fingerprint

| Current runtime surface | Fingerprint dimension | Canonical role now |
| --- | --- | --- |
| `deckStyleFingerprint` in `pptxAudit.ts` | deck-level dominant style snapshot | evidence-backed deck baseline |
| paragraph group `styleSignature` | paragraph-group style signature set | evidence-backed local style traits |
| `dominantBodyStyle` | dominant body-style consensus | evidence-backed local consensus anchor |
| `deckFontUsage` and `slideFontUsage` | usage-distribution evidence | histogram/coverage support |
| category reduction reporting | drift and boundary context | deck-level cleanup truth context |
| readiness summary | drift and boundary context | deck-level trust boundary |
| compliance-oriented report summary | drift and boundary context | taxonomy-aligned governance context |
| brand-score trust hardening | drift and boundary context | score-interpretation restraint |
| multi-deck review summary | future support surface | later repeated-deck comparison structure, not current extraction proof |

## Intended later uses of the fingerprint

If later milestones succeed, this fingerprint should support:

- fingerprint extraction reliability work in M23.2
- safe template match confidence rules in M23.3
- controlled normalization experiments in M23.4
- explainable comparison between repeated decks without hiding deck-level truth

It must not be used later as:

- a shortcut to enterprise compliance scoring
- proof that a deck belongs to a known template family without reliability validation
- a license for broad template enforcement

## Example mappings from current known deck traits

Example: clean eligible deck with uniform body text.

- deck-level dominant style snapshot:
  - `fontFamily: Calibri`
  - `fontSize: 24`
  - `alignment: left`
  - `lineSpacing: 120`
  - `spacingBefore: 6`
  - `spacingAfter: 12`
- paragraph-group style signature set:
  - uniform body groups with matching explicit values
- dominant body-style consensus:
  - same as deck-level dominant values
- drift and boundary context:
  - eligible cleanup boundary
  - no residual drift

Example: mixed deck with stable font family but mixed alignment and line spacing.

- deck-level dominant style snapshot:
  - `fontFamily: Calibri`
  - `fontSize: 24`
  - `alignment: null`
  - `lineSpacing: null`
- paragraph-group style signature set:
  - multiple group signatures with explicit local differences
- dominant body-style consensus:
  - `alignment: null` or `lineSpacing: null` if strict-majority proof fails
- drift and boundary context:
  - partial reduction or manual-review truth may still apply

Example: placeholder-heavy, template-risk deck.

- deck-level dominant style snapshot:
  - some fields may still be populated if runtime evidence exists
- drift and boundary context:
  - boundary-limited
- future extraction target:
  - placeholder-role and template-slot logic may become relevant later
- current truth:
  - current fingerprint spec does not convert this into reliable template intelligence yet

## How this spec supports later template-intelligence work

This specification is designed so later work can ask:

- which parts of style identity are already evidence-backed
- which parts need reliability proof before template matching
- which parts must stay outside automated matching or normalization

That makes later template-intelligence work safer because:

- deck-level dominant values stay inspectable
- group-level signatures remain explainable
- boundary context remains attached
- future template ideas stay clearly marked as future-only until proven

## What this sprint does not prove yet

This sprint does not prove:

- that fingerprint extraction is already reliable across real deck sets
- that template matching is already safe or implemented
- that current runtime fingerprint dimensions are enough for template identification
- that future extraction targets are already derivable from current runtime code
- that the fingerprint spec is a shipping enterprise feature

## M23.1 boundary

This sprint defines the canonical deck-style fingerprint specification only.

It does not:

- implement fingerprint extraction
- implement template matching
- implement cleanup fixes
- implement new detection logic
- redesign readiness scoring in code
- widen product claims beyond current cleanup and reporting evidence
- start M23.2 or later work
