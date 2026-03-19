# CleanDeck - Acceptance Corpus Definition

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- The official category baseline matrix for this corpus is [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- The official report truth gate for readiness and report claims is [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It defines the official acceptance corpus structure for MVP proof under Phase 0 / M18.2.
- It does not define the category baseline matrix, report truth gate, or Phase 1+ implementation work.

## Purpose

The acceptance corpus exists to stop Cleanup claims from drifting beyond demonstrated evidence.

Future MVP proof must use this corpus before:

- engine closure claims widen
- readiness messaging widens
- external beta messaging widens
- later-phase product positioning is allowed to influence planning

## Core rule

The corpus must evaluate all six cleanup categories across the admitted deck set:

- font normalization
- size normalization
- alignment cleanup
- bullet / indent cleanup
- line spacing cleanup
- paragraph spacing cleanup

Not every individual deck must exercise all six categories. The admitted corpus, taken together, must cover all six. At least one hostile stress deck must intentionally exercise all six at once.

## Official corpus classes

### 1. Clean reference decks

Purpose:
- prove the engine can preserve already-good decks and reach an honest `ready` outcome

Represents:
- low-drift decks
- stable baseline decks
- theme-inherited but non-hostile formatting
- decks where structure and editability are already healthy

Engine is expected to:
- preserve structure and editability
- avoid making good decks worse
- normalize only minor safe explicit drift when present
- keep the deck auditably stable

Engine must not be forced to:
- redesign content
- rewrite layout intent
- create new styling decisions beyond safe normalization

Expected outcome:
- `ready`

Why this class is needed:
- a cleanup product that cannot keep good decks good is not trustworthy
- this class proves no-regression and honest ready-path behavior

### 2. Hostile stress-test decks

Purpose:
- prove closure against concentrated, adversarial drift rather than only easy decks

Represents:
- intentionally messy synthetic or sanitized decks
- concentrated simultaneous drift across multiple categories
- decks designed to stress all six MVP cleanup classes at once

Engine is expected to:
- audit the full drift surface honestly
- materially reduce safe in-scope drift across the six categories
- preserve structure and editability while doing so
- surface residual risk instead of hiding it

Engine must not be forced to:
- guarantee a fully `ready` result on every hostile deck
- override explicit unsafe structures just to improve labels
- absorb edge-case or ineligible decks that belong in the unsafe class

Expected outcome:
- `mostlyReady`

Why this class is needed:
- it prevents false confidence driven by easy baseline decks or polished UI
- hostile proof is mandatory because current product truth is still under closure pressure

### 3. Mixed real-world decks

Purpose:
- prove common-case value on naturally messy decks that are still in scope for safe cleanup

Represents:
- sanitized real decks
- realistic synthetic decks that mimic naturally accumulated drift
- decks with mixed but not maximally adversarial problems
- moderate template, placeholder, bullet, spacing, and formatting variation

Engine is expected to:
- close common in-scope drift safely
- improve deck usability without harming editability
- return corrected PPTX plus deterministic report for normal messy-deck cases

Engine must not be forced to:
- repair structural or template semantics that fall outside safe normalization
- hide unresolved drift by over-claiming readiness

Expected outcome:
- `ready`

Why this class is needed:
- this class measures whether the MVP solves the real user problem, not just synthetic baselines
- hostile-only proof is too pessimistic, but easy-only proof is dishonest

### 4. Edge-case / unsafe-case decks

Purpose:
- define the limits of safe cleanup and protect the product from overclaiming

Represents:
- decks with high editability risk
- complex template or master/layout behavior
- grouped-shape or field-node conditions with structural risk
- decks where forcing cleanup could damage tokens, ordering, placeholders, or layout semantics

Engine is expected to:
- audit risk honestly
- preserve structure and editability
- avoid unsafe forced normalization
- surface manual-review needs clearly

Engine must not be forced to:
- normalize by breaking placeholders, grouped content, field order, or other structural semantics
- convert risky decks into `ready` just to satisfy a broad claim

Expected outcome:
- `bad/manual review`

Why this class is needed:
- truthful MVP evaluation requires explicit limit cases
- the product promise is safe partial normalization, not reckless normalization

## Eligible vs ineligible treatment

- `Eligible` decks are in scope for cleanup closure claims.
- `Unsafe but still processable` decks may remain in the corpus with expected outcome `bad/manual review`.
- `Report-only / ineligible` decks are allowed in the corpus when they are necessary to define the truthful product boundary.
- `Report-only / ineligible` decks must not be counted as cleanup-closure failures, but they must remain visible in evidence so scope is not hidden.
- Deck eligibility must be declared at admission time and must not be changed after a disappointing result just to protect milestone claims.

## Hostile vs mixed real-world distinction

- Hostile stress decks are intentionally adversarial. They concentrate drift to test closure pressure.
- Mixed real-world decks are naturally messy or realistic approximations of natural messiness. They are not intentionally maximized for failure.
- A deck with concentrated all-category chaos belongs in the hostile class, not the mixed real-world class.
- A deck with organic uneven drift, moderate template variation, and realistic authoring mistakes belongs in the mixed real-world class, not the hostile class.

## Corpus governance rules

- The roadmap statute wins if any older corpus or milestone doc conflicts with this definition.
- Every admitted deck must have a stable file path and stable identifier.
- Every admitted deck must be sanitized, synthetic, or otherwise safe to store in-repo.
- Every admitted deck must declare:
  - source type
  - corpus class
  - eligibility status
  - expected outcome
  - targeted cleanup categories
  - risk note
  - reason for admission
- One deck may exercise multiple categories.
- The corpus must stay adversarial enough to test truth, not just convenience.
- Local generated files are not official corpus inputs until they are formally admitted.
- Storage folders and execution tiers are not the same thing as corpus classes.

## Admission rules

A deck may be admitted only if it:

- is legally and operationally safe to store
- is deterministic enough for repeated evaluation
- has a clear corpus class
- has a declared eligibility status
- has a declared expected outcome
- contributes useful category coverage or limit-case evidence
- has a clear explanation for why it belongs in MVP proof

Decks should not be admitted if they:

- are redundant with no new category or risk evidence
- are confidential and unsanitized
- only exist to make metrics look better
- only exist to create failures without explaining product-boundary relevance

## Relationship to existing repo assets

- [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json) is the current deck inventory, not the full acceptance-governance contract.
- [testdata/corpus/README.md](../../testdata/corpus/README.md) describes the tracked asset layout and execution tiers, not product-truth authority by itself.
- Existing storage categories such as `simple`, `mixed-formatting`, `bullet-heavy`, `template-heavy`, `field-node`, and `large-decks` are implementation inventory groupings. They do not automatically define acceptance class.
- Local generated artifacts under `testdata/generated/` are candidates only until admitted under the governance rules above.

## How future milestone proof must use this corpus

- M18.3 must baseline the six cleanup categories against this corpus structure, not invent a new corpus definition.
- M18.4 must define report-truth requirements against this corpus structure, not bypass it.
- Phase 1 closure claims must cite this corpus before saying the engine is stronger.
- Phase 2 beta readiness must cite this corpus before widening messaging.

If corpus evidence and product messaging disagree, corpus evidence wins.
