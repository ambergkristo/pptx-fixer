# CleanDeck - AI Post-Processing Scope Definition

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the current narrow Phase 5 evidence in:
  - [24_1_ENFORCEMENT_SCOPE_DEFINITION.md](./24_1_ENFORCEMENT_SCOPE_DEFINITION.md)
  - [24_5_ENTERPRISE_READINESS_REVIEW.md](./24_5_ENTERPRISE_READINESS_REVIEW.md)
  - the current admitted external-template operating envelope
  - the current narrow enforcement core and safety corpus
- It defines M25.1 scope only.
- It does not implement AI pipeline behavior, approve M25.2, widen enforcement scope, or change product truth.

## Purpose

This artifact defines the realistic boundary for using CleanDeck as a post-processing normalization layer after AI deck generation.

The purpose is to encode a deterministic contract for later M25.2 work, not to claim that broad AI deck cleanup is already solved.

## Admission preconditions

AI post-processing eligibility requires all of the following:

1. The generated deck still falls inside the currently proven narrow enforcement envelope.
2. External-template matching returns `admittedMatch`.
3. No `ambiguousMatch`.
4. No `rejectedMatch`.
5. No blocked or conflicting anchor outcome.
6. Only currently supported enforcement classes may be considered.
7. Out-of-scope dimensions remain excluded.
8. If a generated deck requires unsupported structure repair, layout redesign, or narrative rewrite, AI post-processing scope is blocked.

If any admission precondition fails, AI post-processing scope is blocked or out of scope.

## In-scope AI post-processing classes

Only these classes are in scope for future M25.2 work:

- `alignment`
- `fontFamily`

These classes are in scope only after the admission preconditions above are met.

## Out-of-scope AI post-processing classes

These remain explicitly out of scope:

- `fontSize`
- `lineSpacing`
- `paragraphSpacing`
- `bulletIndent`
- `layout redesign`
- `narrative rewrite`
- `slide generation`
- unsupported AI-generated structure repair
- future-only fingerprint dimensions
- excluded semantic or AI-style dimensions

## Required generated-deck boundary

The current generated-deck boundary is:

1. CleanDeck is only a post-processing normalization layer after generation.
2. It does not create slides.
3. It does not rewrite content.
4. It does not redesign layouts.
5. It may only normalize inside the currently proven narrow template-enforcement envelope.
6. If generated decks fall outside that envelope, the product must block, noop, or report rather than overclaim.

## Deterministic scope contract

The deterministic scope contract is defined by:

- [aiPostProcessingScope.ts](../../packages/audit/aiPostProcessingScope.ts)
- [aiPostProcessingScope.test.ts](../../tests/aiPostProcessingScope.test.ts)

The contract classifies cases as:

- `aiPostProcessingEligible`
- `aiPostProcessingBlocked`
- `aiPostProcessingOutOfScope`

The contract also returns explainable reasons, including at minimum:

- admitted external anchor present
- admitted external template match required
- ambiguous template match disallowed
- rejected template match disallowed
- class not in narrow AI post-processing envelope
- unsupported generated-deck failure mode
- generated deck outside proven envelope
- generation or rewrite behavior not supported
- future-only dimensions remain excluded
- out-of-scope dimensions remain excluded

## Explainability / reporting contract

Any later AI post-processing report must be able to say at minimum:

1. Why AI post-processing was allowed or blocked.
2. Which external template anchor was admitted.
3. Which template family was admitted.
4. Which classes were eligible.
5. Which classes were left untouched because they are out of scope.
6. Why generated-deck cleanup was not attempted beyond the proven boundary.

The report must remain narrow and honest. It must not imply:

- broad AI deck cleanup readiness
- narrative correction
- layout redesign
- generator-level intelligence

## Non-goals

This sprint does not:

- implement AI pipeline behavior
- approve M25.2
- widen product truth
- claim broad AI deck cleanup readiness
- claim generator-level intelligence
- claim narrative or layout correction
- widen the default cleanup path

## Exact M25.1 boundary

M25.1 defines scope only.

It does not:

- implement generated-deck cleanup behavior
- merge AI post-processing into the default cleanup path
- approve unsupported AI cleanup classes
- approve M25.2 or later work

## Exact product-truth statement

Product truth does not change.

Current CleanDeck truth remains:

- audit-first deck QA tool with safe partial normalization
- not a template enforcement platform
- not an AI deck post-processing layer

This scope definition encodes only the narrow admitted future AI post-processing envelope. It does not widen product claims.

## Exact approval boundary

M25.2 is **not approved by this sprint**.

Any later M25.2 work must stay inside this scope definition unless later evidence and later review explicitly widen the boundary.
