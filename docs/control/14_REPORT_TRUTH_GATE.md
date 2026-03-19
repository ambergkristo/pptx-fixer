# CleanDeck - Report Truth Gate

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It defines the official Phase 0 / M18.4 report-truth gate for readiness language, category reduction claims, and truthful MVP communication.
- It does not implement readiness scoring, category closure, report UI, report API fields, or Phase 1+ engine work.

## Purpose

This gate exists to stop the report layer, readiness labels, and product messaging from claiming more than the corpus and category baseline matrix actually prove.

The report-truth gate must make it impossible to confuse:

- issue detection with issue correction
- visible improvement with closure
- polished UI with engine proof
- eligible cleanup behavior with unsafe or ineligible deck behavior

## Core rule

If corpus evidence, category baseline status, and report wording disagree, evidence wins.

## Report claim boundaries

### What a report may claim

A report may claim only what is directly supported by:

- the deck's admitted corpus class
- the deck's declared eligibility status
- category-specific evidence allowed by [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md)
- actual observed report output for that specific deck run

Permitted claim types:

- issue detection occurred in named categories
- safe autofix attempted or did not attempt specific categories
- visible reduction is observed in specific categories when the report can show before/after evidence
- residual risk remains in named categories
- the deck currently fits `ready`, `mostlyReady`, `bad/manual review`, or `report-only / ineligible` only when the label is supported by the gate rules below

### What a report must not claim

A report must not claim:

- category closure from detection alone
- closure because a deck visibly improved
- closure because a deck received a favorable readiness label
- closure because the UI, summary, or narrative looks polished
- general engine strength from one or two good decks
- eligible-cleanup success from unsafe or ineligible deck behavior
- hostile-deck closure when only mixed or clean decks improved
- that the MVP is proven until category-level corpus proof exists across the six official categories

## Required reporting separation

The report must keep these concepts separate in wording and structure:

### 1. Detection

- what issues were found
- in which categories they were found
- whether the category was only observed, not corrected

### 2. Correction

- what safe normalization was attempted
- what was materially reduced
- what remained unresolved

### 3. Truth boundary

- whether the deck is eligible, unsafe but still processable, or report-only / ineligible
- which claims are blocked because category closure is still unproven
- whether the label reflects cleanup success, safe refusal, or reporting boundary only

## Category baseline constraints on report wording

- A category marked `Unproven` in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md) may support detection claims and limited deck-specific improvement claims, but not category-closure language.
- A category marked `Partially demonstrated` may support narrow wording such as "limited evidence", "partially demonstrated", or "material reduction observed on this deck" when deck-specific evidence exists. It still must not be described as closed.
- A category marked `Materially improved but not closed` may support stronger reduction wording, but it still must not support closure wording until the matrix status changes.
- Unsafe-case evidence may support safety-boundary wording, but it must not be used to imply successful normalization closure.
- No readiness label may be used as a substitute for category proof.

## Corpus-class and eligibility constraints

### Clean reference decks

Reports may claim:

- no-regression preservation
- minor safe drift reduction
- honest `ready` when the deck remains stable and category truth supports it

Reports must not claim:

- hostile readiness proof
- category closure because the deck was already clean

### Hostile stress-test decks

Reports may claim:

- concentrated drift was detected
- specific categories materially improved when before/after evidence exists
- residual risk remains
- honest `mostlyReady` when the deck materially improves but is not closure-grade

Reports must not claim:

- `ready` by default
- category closure from partial hostile improvement
- broader engine closure unless the matrix and later milestones explicitly support it

### Mixed real-world decks

Reports may claim:

- common in-scope drift was detected
- safe reduction occurred in specific categories when evidence exists
- honest `ready` when the deck reaches the truthful threshold under this gate

Reports must not claim:

- hostile-grade proof
- category closure based only on mixed-deck success

### Edge-case / unsafe-case decks

Reports may claim:

- unsafe conditions or boundary risks were detected
- cleanup was partially attempted and then constrained
- `bad/manual review` or `report-only / ineligible` when appropriate

Reports must not claim:

- successful normalization closure from boundary handling
- eligible cleanup success from a deck that is unsafe or ineligible

### Eligibility statuses

- `Eligible` decks may contribute to truthful cleanup-success claims, but only within the baseline constraints of the exercised categories.
- `Unsafe but still processable` decks may contribute to truthful safety-boundary claims and may still receive `bad/manual review`.
- `Report-only / ineligible` decks may contribute to truthful boundary communication, but they must not be counted as cleanup-closure failures or cleanup-success proof.

## Readiness label gate

### `ready`

A deck may be labeled `ready` only if:

- the deck is `Eligible`
- the deck belongs to a class where `ready` is an acceptable truthful outcome under [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md)
- the report can distinguish corrected categories from detected-only categories
- unresolved risk does not dominate the deck outcome
- no exercised category is described as closed unless the matrix and later milestone proof allow it
- the wording makes clear that `ready` is a deck-level readiness label, not a proof that all engine categories are closed

`ready` must not mean:

- all issues were fixed
- the engine is generally closed
- hostile proof exists
- unsafe categories are solved

### `mostlyReady`

A deck may be labeled `mostlyReady` only if:

- the deck is `Eligible` or `Unsafe but still processable` and the label does not hide the residual risk
- the report shows meaningful reduction in one or more relevant categories
- unresolved issues remain visible
- the wording does not imply category closure or full deck safety

`mostlyReady` must not mean:

- nearly closed in every category
- acceptable to widen MVP claims by itself
- evidence that hostile closure is complete

### `bad/manual review`

A deck may be labeled `bad/manual review` only if:

- the report makes clear that manual intervention is still required
- structural risk, unresolved drift, or unsafe conditions remain material
- the wording distinguishes safe refusal from engine failure when appropriate

`bad/manual review` must not mean:

- the deck is useless
- the engine failed across all categories
- the deck should be counted automatically as a closure miss if it is unsafe or ineligible by admission rules

### `report-only / ineligible`

A deck may be labeled `report-only / ineligible` only if:

- the report clearly states why the deck is outside cleanup-closure scope
- the deck's ineligible status is visible in the result
- the report avoids using the deck as evidence of cleanup closure or cleanup failure

`report-only / ineligible` must not mean:

- the deck is ignored
- the boundary evidence disappears from MVP truth

## Required truthful report fields or wording

Before the product can communicate MVP truth honestly, the report contract must expose at least these concepts in wording or fields:

- deck identifier
- corpus class
- eligibility status
- deck-level readiness label
- per-category detection status
- per-category correction status
- per-category residual risk or unresolved note
- explicit distinction between corrected, partially improved, unchanged, and unsafe-to-correct states
- statement that current readiness is deck-level only and does not imply full category closure unless separately proven

The exact implementation format may change later, but the truth distinctions above must remain explicit.

## Allowed product messaging under this gate

Current truthful messaging may say:

- CleanDeck audits existing decks and applies safe partial normalization
- the product produces a deterministic report and corrected PPTX
- some categories show limited or partial evidence, but closure is not complete
- hostile proof remains mandatory before broader claims

Current truthful messaging must not say:

- the cleanup engine is closed
- readiness labels alone prove MVP completion
- report output alone proves normalization success
- all six categories are solved

## What remains blocked until later milestones

The following remain blocked until later milestones produce stronger proof:

- category-closure language for categories currently marked `Unproven` or `Partially demonstrated`
- broad MVP-proof claims
- external-beta messaging that implies stable readiness trust beyond the proven boundary
- hostile-deck closure claims without Phase 1 and Phase 2 proof
- category reduction reporting as a proof surface beyond the conservative wording allowed here
- readiness hardening rules that assume closure-level engine behavior

## M18.4 boundary

This sprint defines the report-truth gate only.

This document does not start Phase 1 and does not define:

- engine diagnosis work
- normalization implementation work
- report UI or API implementation work
- readiness scoring algorithms
- category closure decisions
- future market expansion claims

If report wording and engine proof disagree, engine proof wins.
