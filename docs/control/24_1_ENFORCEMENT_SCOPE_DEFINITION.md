# CleanDeck - Enforcement Scope Definition

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It is aligned with the official eligibility boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It is aligned with the official deck style fingerprint specification in [22_DECK_STYLE_FINGERPRINT_SPEC.md](./22_DECK_STYLE_FINGERPRINT_SPEC.md).
- It is aligned with the official breadth re-gate review in [23R6_BREADTH_RE_GATE_REVIEW.md](./23R6_BREADTH_RE_GATE_REVIEW.md).
- It is aligned with the official Phase 4 closure proof pack in [23R7_PHASE4_CLOSURE_PROOF_PACK.md](./23R7_PHASE4_CLOSURE_PROOF_PACK.md).
- It is aligned with the official external template match envelope build in M23.R8 runtime proof.
- It defines M24.1 scope only.
- It does not implement enforcement behavior, widen the default cleanup pipeline, approve M24.2, or change product truth.

## Purpose

This artifact defines the exact narrow enforcement scope that current evidence supports for future M24.2 implementation work.

The purpose is to encode a deterministic contract, not to approve enforcement runtime behavior in this sprint.

## Admission preconditions

Enforcement-scope eligibility requires all of the following:

1. An `admittedMatch` from the external template operating envelope.
2. Exactly one admitted external template anchor.
3. No `ambiguousMatch`.
4. No blocked or conflicting anchor outcome.
5. No `weak` or `unavailable` template-match path.
6. Current trusted positive evidence rules remain intact:
   - `usageDistributionEvidence` remains the only trusted positive admission source.
   - corroborating dimensions may support, cap, or block, but may not independently admit.
7. Future-only dimensions remain excluded.
8. Out-of-scope dimensions remain excluded.

If any admission precondition fails, enforcement scope is blocked.

## In-scope enforcement classes

Only these classes are in scope for future M24.2 implementation:

- `alignment`
- `font family`

These classes are in scope only after the admission preconditions above are met.

## Out-of-scope enforcement classes

These classes remain explicitly out of scope for future enforcement core unless later proof changes the boundary:

- `font size`
- `line spacing`
- `paragraph spacing`
- `bullet indent`
- future-only fingerprint dimensions:
  - `repeatedLayoutModuleSignatures`
  - `placeholderRolePatterns`
  - `templateSlotSimilarity`
  - `slideFamilyClustering`
  - `templateMatchConfidenceTraits`
- excluded or out-of-scope dimensions:
  - `semanticNarrativeIntent`
  - `contentMeaning`
  - `aiStyleSimilarity`
  - `orgPolicyComplianceScoring`
  - `fullTemplateEnforcementSignals`

## Required runtime boundary

The runtime boundary for any later M24.2 implementation is:

1. Enforcement can only be considered after an admitted external-template match.
2. `ambiguousMatch` must not trigger enforcement.
3. `rejectedMatch` must not trigger enforcement.
4. The normal non-template cleanup path remains separate.
5. This scope definition does not itself approve any behavior outside the narrow admitted envelope.

## Deterministic scope contract

The deterministic scope contract is defined by:

- [templateEnforcementScope.ts](../../packages/audit/templateEnforcementScope.ts)
- [templateEnforcementScope.test.ts](../../tests/templateEnforcementScope.test.ts)

The contract classifies cases as:

- `enforcementEligible`
- `enforcementBlocked`
- `enforcementOutOfScope`

The contract also returns explainable reasons, including at minimum:

- admitted external anchor present
- admitted external template match required
- ambiguous template match disallowed
- rejected template match disallowed
- class not in narrow enforcement envelope
- future-only dimensions remain excluded
- out-of-scope dimensions remain excluded

## Explainability / reporting contract

Any later enforcement report must be able to say at minimum:

1. Why enforcement was allowed or blocked.
2. Which external template anchor was admitted.
3. Which template family was admitted.
4. Which classes were eligible.
5. Which classes were left untouched because they are out of scope.
6. Why enforcement was blocked or not attempted.

The report must remain narrow and honest. It must not imply:

- full template intelligence
- enterprise readiness
- template enforcement beyond the admitted envelope

## Non-goals

This sprint does not:

- implement enforcement behavior
- approve M24.2
- widen product truth
- claim enterprise readiness
- claim full template intelligence
- widen the default cleanup pipeline

## Exact M24.1 boundary

M24.1 defines scope only.

It does not:

- apply template-enforcement mutations
- merge template enforcement into the default cleanup path
- approve out-of-scope classes
- approve M24.2 or later work

## Exact product-truth statement

Product truth does not change.

Current CleanDeck truth remains:

- audit-first deck QA tool with safe partial normalization
- not a template enforcement platform
- not an AI deck post-processing layer

This scope definition encodes only the narrow admitted future enforcement envelope. It does not widen product claims.

## Exact approval boundary

M24.2 is **not approved by this sprint**.

Any later M24.2 work must stay inside this scope definition unless later evidence and later review explicitly widen the boundary.
