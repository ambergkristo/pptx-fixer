# CleanDeck - Template Intelligence Re-Gate Review

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
- It is aligned with the official template intelligence gate review in [23_TEMPLATE_INTELLIGENCE_GATE_REVIEW.md](./23_TEMPLATE_INTELLIGENCE_GATE_REVIEW.md).
- It is aligned with the official fingerprint target eligibility matrix in [23R1_FINGERPRINT_TARGET_ELIGIBILITY_MATRIX.md](./23R1_FINGERPRINT_TARGET_ELIGIBILITY_MATRIX.md).
- It is aligned with the official template intelligence corpus gap expansion in [23R2_TEMPLATE_INTELLIGENCE_CORPUS_GAP_EXPANSION.md](./23R2_TEMPLATE_INTELLIGENCE_CORPUS_GAP_EXPANSION.md).
- It reviews the demonstrated evidence from M23.1, M23.2, M23.3, M23.4, M23.5, M23.R1, M23.R2, and M23.R3 only.
- It does not implement enforcement logic, default pipeline changes, template enforcement scope, or any M24.x work.

## Purpose

This review re-evaluates Phase 4 after the recovery block and decides whether the cumulative evidence justifies any forward motion toward Phase 5.

The review remains conservative. Narrow experimental proof must not be upgraded into operational readiness. Product truth must not widen without stronger evidence.

## Scope reviewed

This re-gate review evaluates:

1. M23.1 fingerprint structure clarity
2. M23.2 fingerprint extraction reliability
3. M23.3 template-match confidence rule conservatism
4. M23.4 alignment-only experimental normalization proof
5. M23.5 original gate verdict
6. M23.R1 target eligibility reality
7. M23.R2 corpus-gap recovery plan
8. M23.R3 single non-alignment font-family recovery proof

It does not evaluate:

- M24.1 enforcement scope design as implementation work
- M24.2 enforcement core safety
- product-positioning upgrades
- template enforcement readiness as an implemented capability

## Evidence considered

### M23.1 - Fingerprint structure clarity

Reviewed authority:

- [22_DECK_STYLE_FINGERPRINT_SPEC.md](./22_DECK_STYLE_FINGERPRINT_SPEC.md)

What remains true:

- the fingerprint structure is explainable
- evidence-backed, future-only, and out-of-scope dimensions remain clearly separated

What remains unproven:

- runtime reliability for the full fingerprint surface
- operational template identity extraction
- enforcement-grade normalization safety

### M23.2 - Fingerprint extraction reliability

Reviewed runtime surface:

- [fingerprintExtractionReliabilitySummary.ts](../../packages/audit/fingerprintExtractionReliabilitySummary.ts)
- [fingerprintExtractionReliabilitySummary.test.ts](../../tests/fingerprintExtractionReliabilitySummary.test.ts)

What remains partial:

- `deckLevelDominantStyleSnapshot` is still only partly resolved on the reviewed subset
- `paragraphGroupStyleSignatures` remain partial
- `dominantBodyStyleConsensus` remains partial on some decks

What remains null-capped:

- `dominantBodyStyleConsensus` still degrades to `deterministicNull` on template-heavy structure-risk input

What remains excluded:

- future-only fingerprint dimensions remain excluded from current runtime capability
- out-of-scope dimensions remain excluded entirely

Conservative conclusion:

- extraction reliability is still real but narrow
- only `usageDistributionEvidence` is fully reliable across the reviewed subset
- current extraction evidence is still not broad enough for operational template identification

### M23.3 - Confidence rule conservatism

Reviewed runtime surface:

- [templateMatchConfidenceSummary.ts](../../packages/audit/templateMatchConfidenceSummary.ts)
- [templateMatchConfidenceSummary.test.ts](../../tests/templateMatchConfidenceSummary.test.ts)

What remains true:

- trusted positive evidence still comes only from `usageDistributionEvidence`
- deck-level snapshot and dominant-body-style consensus remain corroborating-only
- paragraph-group signatures remain excluded from trusted confidence
- maximum allowed confidence remains `moderate`

Conservative conclusion:

- the confidence system remains appropriately conservative for current evidence
- it is not too weak relative to the demonstrated proof; it is correctly bounded
- it still does not justify strong or operational template identification claims

### M23.4 - Alignment-only experimental normalization proof

Reviewed runtime surface:

- [fingerprintBasedNormalizationExperiment.ts](../../packages/experiment/fingerprintBasedNormalizationExperiment.ts)
- [fingerprintBasedNormalizationExperiment.test.ts](../../tests/fingerprintBasedNormalizationExperiment.test.ts)

What remains true:

- the experiment remains isolated from the default cleanup path
- explicit invocation remains required
- `unavailable`, `weak`, and `blocked` confidence still prevent application
- the original real-deck proof remains alignment-only

Conservative conclusion:

- alignment remains the only established experimental target with broader Phase 4 proof
- the alignment proof remains narrow but real
- it still does not justify productized template-targeted normalization

### M23.5 - Original gate verdict

Reviewed authority:

- [23_TEMPLATE_INTELLIGENCE_GATE_REVIEW.md](./23_TEMPLATE_INTELLIGENCE_GATE_REVIEW.md)

What remains true:

- the original verdict was `notReady`
- Phase 5 was blocked
- M24.1 could not begin

Conservative conclusion:

- any more permissive verdict now must be justified by genuinely broader evidence than was available at M23.5

### M23.R1 - Target eligibility reality

Reviewed authority:

- [23R1_FINGERPRINT_TARGET_ELIGIBILITY_MATRIX.md](./23R1_FINGERPRINT_TARGET_ELIGIBILITY_MATRIX.md)

What remains true:

- `alignment` was the only current `experimentEligible` target
- `font family` and `font size` were only `candidateOnly`
- spacing and bullet-indent classes remained blocked or excluded

Conservative conclusion:

- the eligibility boundary was intentionally narrow and proof-driven

### M23.R2 - Corpus-gap recovery plan

Reviewed authority:

- [23R2_TEMPLATE_INTELLIGENCE_CORPUS_GAP_EXPANSION.md](./23R2_TEMPLATE_INTELLIGENCE_CORPUS_GAP_EXPANSION.md)

What remains true:

- non-alignment proof gaps were defined explicitly
- `font family` and `font size` were the least-blocked next candidates
- spacing and bullet-indent classes remained blocked pending reliability improvement

Conservative conclusion:

- the recovery plan correctly separated missing-proof diagnosis from actual proof

### M23.R3 - Single non-alignment font-family recovery proof

Reviewed runtime surface:

- [fingerprintBasedNormalizationExperiment.ts](../../packages/experiment/fingerprintBasedNormalizationExperiment.ts)
- [fingerprintBasedNormalizationExperiment.test.ts](../../tests/fingerprintBasedNormalizationExperiment.test.ts)
- [manifest.json](../../testdata/corpus/manifest.json)

Newly demonstrated evidence since M23.5:

- one isolated `fontFamily` recovery path now exists under explicit `targetClass: "fontFamily"`
- the path remains opt-in only
- the path still requires `moderate` confidence
- a controlled corpus pair now demonstrates:
  - `experimentStatus: "experimentApplied"`
  - `selectedExperimentStages: ["fontFamilyFix"]`
  - `fontDriftBefore: 1 -> 0`
  - `fontSizeDriftBefore: 0 -> 0`
  - `alignmentDriftBefore: 0 -> 0`
- weak confidence still degrades to `notEligible` and no-op on the same target class

Conservative conclusion:

- this is real new proof
- it is still narrow and corpus-bound
- it proves only one controlled non-alignment class under one controlled comparison setup
- it does not make `font family` broadly experiment-eligible across general template-intelligence conditions

## What is newly proven since M23.5

The recovery block adds two real advances beyond the original M23.5 state:

1. The proof boundary is now better controlled and documented through M23.R1 and M23.R2.
2. One non-alignment class, `font family`, now has a narrow successful experimental proof under the existing confidence gate.

That is meaningful progress, but it remains limited to:

- one class
- one narrow target path
- one controlled corpus comparison setup
- one opt-in experimental route

## What remains unproven

The combined evidence still does not prove:

- that template identification is operationally usable
- that template identification is enforcement-grade
- that fingerprint-driven normalization is broadly proven beyond narrow experiments
- that `font family` targetability is broadly reusable outside the current recovery corpus proof
- that `font size` has any equivalent proof
- that spacing or bullet-indent targetability has improved
- that Phase 5 enforcement safety is demonstrated

## Exact answer on target eligibility reality

`alignment` remains the only broadly established `experimentEligible` target in current Phase 4 evidence.

`font family` now has **narrow proof only**.

`font family` does **not** yet have broad experiment eligibility.

`font size` does not materially improve in this recovery block.

No spacing class improves in this recovery block.

No bullet-indent class improves in this recovery block.

## Exact answer on the Phase 5 readiness question

Is template identification operationally usable and explainable yet?

- No. It is explainable, but still not operationally usable beyond narrow experimental conditions.

Is fingerprint-driven normalization proven beyond narrow experiments?

- No. It is now proven for one alignment path and one narrow font-family path only.

Is there enough evidence to begin M24.1 scope-definition work only?

- No. The evidence is still too narrow, too corpus-bound, and too class-specific.

Or must Phase 5 remain blocked?

- Phase 5 must remain blocked.

## Why the recovery evidence is still insufficient

1. Extraction reliability is still only partly full outside the strongest histogram evidence.
2. Confidence remains capped at `moderate`, which is still appropriate for the proof boundary.
3. The new `font family` proof is one narrow success, not a broader class-level operating envelope.
4. `font size` has no parallel recovery proof.
5. Spacing and bullet-indent classes remain blocked from the recovery plan itself.
6. The experimental path is still intentionally opt-in and isolated, not operational.

## Verdict

**Verdict: `notReady`**

## Exact gate decision

Phase 5 remains blocked.

M24.1 may **not** begin on the current evidence.

M24.2 and later Phase 5 work are **not approved** by this sprint.

## Why the verdict is not `readyForScopedDefinitionOnly`

`readyForScopedDefinitionOnly` is still not justified because the recovery evidence remains too narrow:

- only one non-alignment class improved
- that improvement is still corpus-bound
- no broader targetability upgrade was demonstrated
- extraction, confidence, and targeting still remain too partial for scope-definition entry

The recovery block improved knowledge and produced one narrow non-alignment proof. It did not produce enough breadth to justify beginning M24.1 safely.

## Exact product-truth statement

Product truth does not change.

Current CleanDeck truth remains:

- audit-first deck QA tool with safe partial normalization
- not a template enforcement platform
- not an AI deck post-processing layer

The recovery block improves Phase 4 evidence quality, but it does not change product positioning or approve template-enforcement claims.

## What this sprint does not prove yet

This sprint does not prove:

- that Phase 5 should start
- that M24.1 is approved
- that template matching is solved
- that template-targeted normalization is operationally approved
- that the `font family` recovery proof generalizes beyond its current narrow corpus setup
- that product truth should change

## M23.R4 boundary

This sprint is a re-gate review only.

It does not:

- implement enforcement logic
- widen default cleanup behavior
- productize experimental normalization
- start M24.1
- approve M24.2 or later work
- change product truth
