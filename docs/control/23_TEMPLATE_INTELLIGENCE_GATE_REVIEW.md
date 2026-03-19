# CleanDeck - Template Intelligence Gate Review

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
- It is aligned with the official deck style fingerprint specification in [22_DECK_STYLE_FINGERPRINT_SPEC.md](./22_DECK_STYLE_FINGERPRINT_SPEC.md).
- It reviews the demonstrated evidence from M23.1 through M23.4 only.
- It does not implement enforcement logic, template enforcement scope, runtime pipeline changes, or any M24.x work.

## Purpose

This review decides whether Phase 4 has demonstrated enough to justify moving toward Phase 5.

The decision must remain conservative. Evidence wins over roadmap ambition. Experimental proof must not be upgraded into production readiness.

## Scope reviewed

This gate review evaluates:

1. M23.1 fingerprint structure clarity
2. M23.2 fingerprint extraction reliability
3. M23.3 template-match confidence rule conservatism
4. M23.4 fingerprint-based normalization experiment isolation and proof

It does not evaluate:

- M24.1 enforcement scope design
- M24.2 enforcement core safety
- product positioning upgrades
- template enforcement readiness as an implemented capability

## Evidence considered

### M23.1 - Fingerprint structure clarity

Reviewed authority:

- [22_DECK_STYLE_FINGERPRINT_SPEC.md](./22_DECK_STYLE_FINGERPRINT_SPEC.md)

What M23.1 proved:

- the canonical fingerprint vocabulary is defined
- the top-level fingerprint dimensions are explainable
- current evidence-backed dimensions are separated from future extraction targets
- out-of-scope dimensions are named explicitly

What M23.1 did not prove:

- runtime extraction reliability
- template matching
- normalization safety
- enforcement readiness

### M23.2 - Fingerprint extraction reliability

Reviewed runtime surface:

- [fingerprintExtractionReliabilitySummary.ts](../../packages/audit/fingerprintExtractionReliabilitySummary.ts)
- [fingerprintExtractionReliabilitySummary.test.ts](../../tests/fingerprintExtractionReliabilitySummary.test.ts)

Current reviewed evidence:

- `usageDistributionEvidence` reached `deterministicFull` on the reviewed deck subset
- `deckLevelDominantStyleSnapshot` remained `deterministicPartial` across the reviewed deck subset
- `paragraphGroupStyleSignatures` remained `deterministicPartial` across the reviewed deck subset
- `dominantBodyStyleConsensus` remained `deterministicPartial` on some decks and `deterministicNull` on template-heavy structure-risk input

Conservative interpretation:

- current extraction reliability is real, but narrow
- only part of the fingerprint surface is fully reliable
- the current evidence does not show broad, high-confidence template identity extraction

### M23.3 - Template match confidence rule conservatism

Reviewed runtime surface:

- [templateMatchConfidenceSummary.ts](../../packages/audit/templateMatchConfidenceSummary.ts)
- [templateMatchConfidenceSummary.test.ts](../../tests/templateMatchConfidenceSummary.test.ts)

Current reviewed evidence:

- trusted positive template-match evidence comes only from `usageDistributionEvidence`
- deck-level style snapshot and dominant-body-style consensus are corroborating-only
- paragraph-group signature sets are excluded from trusted template confidence
- `deterministicNull`, partial conflict, and narrow-overlap cases degrade confidence safely
- the maximum allowed confidence label is `moderate`

Conservative interpretation:

- the confidence system is explainable and deliberately restrained
- template identification is not presented as solved
- current confidence evidence is intentionally insufficient to support strong or enforcement-grade matching

### M23.4 - Fingerprint-based normalization experiment

Reviewed runtime surface:

- [fingerprintBasedNormalizationExperiment.ts](../../packages/experiment/fingerprintBasedNormalizationExperiment.ts)
- [fingerprintBasedNormalizationExperiment.test.ts](../../tests/fingerprintBasedNormalizationExperiment.test.ts)

Current reviewed evidence:

- the experiment is isolated from the default cleanup path
- explicit invocation is required
- `unavailable`, `weak`, and `blocked` confidence do not trigger the experiment
- the current experiment allows only a narrow safe stage set
- the reviewed real-deck proof remains alignment-only:
  - moderate-confidence eligible case: alignment drift `2 -> 0`
  - weak-confidence case: alignment drift remained `2 -> 2`
- the experiment reuses proven-safe normalization primitives and adds an extra discard-on-unsafe-change guardrail

Conservative interpretation:

- normalization toward a detected style is only demonstrated experimentally
- the current experiment is too narrow to support operational template-intelligence claims
- the evidence is still alignment-only, not general style-enforcement proof

## Proven capabilities

The current Phase 4 evidence does support the following narrow claims:

- A canonical and explainable fingerprint specification exists.
- Several fingerprint-relevant dimensions can be extracted deterministically.
- Template-match confidence is conservative, bounded, and safely degrading.
- An opt-in experimental normalization pass can run deterministically under a `moderate` confidence gate.
- The experimental normalization path is isolated from the default production cleanup pipeline.

## Unproven or still narrow areas

The current evidence does not prove:

- that template identification is broadly usable
- that template identification is enforcement-grade
- that the fingerprint surface is reliable enough across template-heavy or structure-risk decks
- that current confidence rules can support operational template decisions beyond a narrow experiment gate
- that fingerprint-driven normalization is broader than alignment-only
- that template-targeted normalization is safe enough for default or productized use
- that Phase 5 enforcement safety has been demonstrated

## Exact answer to the alignment-only question

Current evidence is **not broader than alignment-only** for fingerprint-driven normalization proof.

Reason:

- M23.4’s demonstrated real-deck experiment proof shows a narrow alignment normalization path only
- no comparable real-deck proof exists yet for broader multi-dimension template-derived normalization
- M23.2 and M23.3 remain intentionally conservative on partially extractable dimensions

## Key blockers and risks

1. Current extraction reliability is still only partially full.
   `usageDistributionEvidence` is fully reliable in the reviewed subset, but the rest of the fingerprint surface is still mostly partial or null-capped.

2. Template confidence is deliberately capped at `moderate`.
   That is correct for safety, but it also means current evidence does not yet justify claiming strong template identification.

3. The normalization experiment is still narrow and alignment-only.
   This is useful evidence for safe experimentation, not for enforcement readiness.

4. Template-heavy and structure-risk cases still degrade rather than resolve into usable template intelligence.
   That is truthful and safe, but it blocks a claim that template identification is broadly usable.

5. No evidence yet shows enforcement-grade behavior on a scoped real-world template family.
   Phase 4 has proven control surfaces and experimental caution, not enforcement safety.

## Verdict

**Verdict: `notReady`**

## Exact gate decision

Phase 5 remains blocked.

M24.1 may **not** begin on the current evidence.

M24.2 and later Phase 5 work are **not approved** by this sprint.

## Why the verdict is not more permissive

`readyForScopedDefinitionOnly` is not justified yet because the current proof is still too narrow:

- extraction is only partly full
- template confidence is intentionally capped and non-strong
- normalization proof is still experimental-only
- demonstrated experiment proof is still alignment-only

That is enough to justify continued caution, not enough to justify entering enforcement-scope definition.

## Exact boundary statement

Current CleanDeck truth remains:

- audit-first deck QA tool with safe partial normalization
- not a template enforcement platform
- not a solved template-intelligence system

Phase 4 has produced useful structure, reliability evidence, conservative confidence rules, and one narrow experimental normalization proof.

It has **not** produced evidence that template enforcement is ready, or that template matching is operationally solved.

## What this sprint does not prove yet

This sprint does not prove:

- that Phase 5 should start
- that M24.1 is approved
- that template enforcement scope is ready to define
- that template matching is solved
- that template-targeted normalization is safe beyond the current narrow experiment
- that product truth should change

## M23.5 boundary

This sprint is a gate review only.

It does not:

- implement enforcement logic
- widen default cleanup behavior
- productize experimental normalization
- start M24.1
- approve M24.2 or later work
