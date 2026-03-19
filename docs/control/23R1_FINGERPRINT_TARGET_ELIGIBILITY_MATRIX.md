# CleanDeck - Fingerprint Target Eligibility Matrix

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
- It is grounded in the demonstrated runtime evidence from:
  - [fingerprintExtractionReliabilitySummary.ts](../../packages/audit/fingerprintExtractionReliabilitySummary.ts)
  - [templateMatchConfidenceSummary.ts](../../packages/audit/templateMatchConfidenceSummary.ts)
  - [fingerprintBasedNormalizationExperiment.ts](../../packages/experiment/fingerprintBasedNormalizationExperiment.ts)
- It defines the canonical M23.R1 eligibility matrix for fingerprint-driven normalization targets only.
- It does not implement enforcement behavior, broaden the default cleanup pipeline, change the M23.5 gate verdict, or begin any M24.x work.

## Purpose

This recovery artifact defines which fingerprint dimensions and target classes are currently:

- `excluded`
- `blocked`
- `candidateOnly`
- `experimentEligible`

The matrix is evidence-based, not aspirational. Fingerprint evidence alone is not enough. A dimension becomes `experimentEligible` only when current Phase 4 proof shows all of the following:

1. extraction is currently trustworthy enough to use conservatively
2. confidence handling remains safe and explainable
3. the experiment path already permits the target
4. real deck proof shows the target can be applied safely under the current experimental rules

## Scope reviewed

This matrix reviews the demonstrated evidence from:

1. M23.1 fingerprint structure clarity
2. M23.2 fingerprint extraction reliability
3. M23.3 template-match confidence rules
4. M23.4 fingerprint-based normalization experiments
5. M23.5 template intelligence gate review

It does not review or approve:

- Phase 5 enforcement scope
- template-targeted normalization in the default pipeline
- productized template matching
- any broader claim than the current experimental proof

## Canonical status meanings

- `excluded`
  The dimension or target is future-only, out of scope, or explicitly excluded from current experimental targeting.
- `blocked`
  The dimension or target is relevant, but current evidence or rules explicitly stop it from driving normalization safely.
- `candidateOnly`
  Current evidence may justify planning or gated candidate generation, but not live experimental application on present proof.
- `experimentEligible`
  Current evidence supports narrow opt-in experimental targeting now. This does not approve default behavior, enforcement, or Phase 5.

## Conservative rules carried forward from M23.5

1. Template matching remains unsolved for operational enforcement purposes.
2. The M23.5 verdict remains `notReady`.
3. M24.1 may not begin.
4. Evidence is still not broader than alignment-only for fingerprint-driven normalization proof.
5. Fingerprint evidence existing is not the same thing as safe normalization targetability existing.

## Eligibility matrix

| Item | Extraction reliability status | Confidence contribution status | Experiment targetability status | Why it is or is not eligible now | What proof is still missing if not eligible |
| --- | --- | --- | --- | --- | --- |
| `usageDistributionEvidence` | `deterministicFull` on the reviewed subset in M23.2 | `trustedPositiveEligible`; the only current trusted positive input in M23.3 | `candidateOnly` | It is the strongest current fingerprint evidence and is required for any positive confidence path, but it does not by itself prove a safe normalization target. No real-deck experiment has yet shown that histogram agreement alone safely drives non-alignment normalization. | Real-deck proof that usage-distribution agreement can safely drive at least one non-alignment experimental target without overreach. |
| `deckLevelDominantStyleSnapshot` | `deterministicPartial` on the reviewed subset in M23.2 | `corroboratingOnly` in M23.3 | `candidateOnly` | It can help form shared candidate targets, but partial deck-level fields are intentionally not trusted as standalone positive evidence. Current proof does not justify upgrading partial snapshot agreement into applied experimental targeting by itself. | Broader full-field reliability or target-specific real-deck proof that partial snapshot agreement is sufficient for safe experimental action. |
| `dominantBodyStyleConsensus` | `deterministicPartial` on some decks and `deterministicNull` on template-heavy input in M23.2 | `corroboratingOnly` in M23.3 | `candidateOnly` | It is useful as a local corroboration anchor, but null-capped and partial behavior means it cannot generally authorize normalization targets across dimensions. Only the separate alignment target currently escapes this general limit through narrower proof. | Reliable non-alignment field proof under real decks, plus evidence that null-capped cases do not create false targets. |
| `paragraphGroupStyleSignatures` | `deterministicPartial` on the reviewed subset in M23.2 | `excludedFromTrustedConfidence` in M23.3 | `excluded` | The current system explicitly refuses to treat paragraph-group signatures as trusted template-match evidence. M23.4 also excludes them from experimental targeting. | Full extraction reliability and a later decision to admit them into trusted confidence, neither of which currently exists. |
| `alignment` targetability | Current target depends on partial snapshot plus partial consensus, but real-deck experimental proof exists under the current guardrails | No standalone trusted contribution; allowed only after upstream `moderate` confidence is already reached | `experimentEligible` | This is the only target with actual real-deck applied proof in M23.4. The experimental runner permits it, the confidence gate must already be `moderate`, and the extra discard-on-unsafe-change rule rejects non-alignment dominant-body-style mutations. | No missing proof is required for narrow experimental eligibility now. Broader proof is still missing for default-path use or Phase 5. |
| `font family` targetability | Shared target can be derived from current evidence, but the relevant fingerprint fields remain partial outside usage histograms | Requires upstream `moderate` confidence; no standalone trusted contribution | `candidateOnly` | The experiment planner may recognize a font-family candidate, and the engine already has a proven-safe font-family fix elsewhere, but M23.4 did not produce real-deck applied proof for fingerprint-driven font-family normalization. | Real-deck applied experiment proof showing safe fingerprint-driven font-family targeting under current confidence rules. |
| `font size` targetability | Shared target can be derived from current evidence, but the relevant fingerprint fields remain partial outside usage histograms | Requires upstream `moderate` confidence; no standalone trusted contribution | `candidateOnly` | The planner can recognize a font-size candidate, and the engine already has a proven-safe font-size fix elsewhere, but there is no real-deck Phase 4 proof that fingerprint-derived font-size targets are safe to apply experimentally. | Real-deck applied experiment proof showing safe fingerprint-driven font-size targeting under current confidence rules. |
| `line spacing` targetability | Fingerprint fields tied to spacing remain partial or null-capped in current extraction surfaces | Not a trusted confidence input in M23.3 | `blocked` | M23.4 explicitly excludes line spacing from experimental targeting. Current Phase 4 proof does not show reliable fingerprint-derived spacing targets, even though spacing cleanup exists elsewhere in the engine. | Reliable fingerprint-side spacing target extraction, trusted confidence admission if appropriate, and real-deck experiment proof. |
| `paragraph spacing` targetability | Fingerprint fields tied to spacing remain partial or null-capped in current extraction surfaces | Not a trusted confidence input in M23.3 | `blocked` | M23.4 explicitly excludes paragraph spacing from experimental targeting. Existing spacing safety proof in Phase 1 is not enough to upgrade fingerprint-derived targetability. | Reliable fingerprint-side paragraph-spacing target extraction, trusted confidence admission if appropriate, and real-deck experiment proof. |
| `bullet indent` targetability | Only indirectly represented through paragraph-group signatures and `bulletLevel`, which remain partial | Excluded indirectly because paragraph-group signatures are excluded from trusted confidence | `blocked` | Current fingerprint evidence for bullet indentation is too indirect and too excluded to drive experiments safely. M23.4 also explicitly excludes bullet indentation from targeting. | Reliable target extraction beyond partial group signatures, plus real-deck experiment proof under current confidence boundaries. |
| Future-only fingerprint dimensions: `repeatedLayoutModuleSignatures`, `placeholderRolePatterns`, `templateSlotSimilarity`, `slideFamilyClustering`, `templateMatchConfidenceTraits` | Future-only; not current extraction capability | Excluded from current confidence by design | `excluded` | These were explicitly kept future-only in M23.1 through M23.5. They are not current runtime capability and must not drive experiments now. | Separate future reliability proof and later scope approval. |
| Out-of-scope dimensions: `semanticNarrativeIntent`, `contentMeaning`, `aiStyleSimilarity`, `orgPolicyComplianceScoring`, `fullTemplateEnforcementSignals` | Explicitly out of scope | Excluded | `excluded` | These are not part of current fingerprint-driven normalization truth and cannot be upgraded by Phase 4 evidence. | None within M23.R1. They remain outside current scope. |

## Exact answer on what is experiment eligible now

Only `alignment` targetability is currently `experimentEligible`.

No dimension beyond alignment is currently `experimentEligible`.

## Why non-alignment targets are still not eligible

Current non-alignment targets stay below `experimentEligible` for one or more of these reasons:

- the trusted positive confidence path is still narrow and histogram-led
- deck snapshot and dominant-body-style fields remain partial or null-capped outside the alignment proof path
- paragraph-group signatures are still excluded from trusted confidence
- spacing and bullet-indent targets are explicitly excluded or blocked in the M23.4 experimental runner
- no real-deck applied proof exists yet for fingerprint-driven font-family or font-size normalization

## Exact relationship to the M23.5 gate

This matrix does not change the M23.5 verdict.

The official gate status remains:

- `notReady`
- Phase 5 remains blocked
- M24.1 may not begin

This matrix is a recovery control artifact only. It narrows experimental target truth; it does not reopen template-intelligence readiness.

## Proven capability vs targetability boundary

Current proven capability:

- explainable fingerprint structure exists
- some fingerprint dimensions extract deterministically
- confidence degrades conservatively
- one narrow alignment-only experiment can run safely under opt-in moderate-confidence conditions

Current unproven capability:

- broader template identification
- enforcement-grade target selection
- non-alignment fingerprint-driven normalization on real decks
- template enforcement readiness

## What this sprint does not prove yet

This sprint does not prove:

- that any non-alignment target should be upgraded to `experimentEligible`
- that template matching is solved
- that default cleanup behavior may widen
- that Phase 5 should start
- that M24.1 is approved
- that template enforcement is safe or productized

## M23.R1 boundary

This sprint defines the canonical fingerprint target eligibility matrix only.

It does not:

- implement enforcement behavior
- widen default cleanup behavior
- add broad normalization logic
- change the M23.5 `notReady` verdict
- start M24.1
