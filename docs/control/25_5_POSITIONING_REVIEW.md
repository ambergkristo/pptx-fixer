# CleanDeck - Positioning Review

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It reviews the actual evidence produced by:
  - [25_1_AI_POST_PROCESSING_SCOPE_DEFINITION.md](./25_1_AI_POST_PROCESSING_SCOPE_DEFINITION.md)
  - M25.2 generated-deck corpus and failure-mode classifier
  - M25.3 post-processing report contract
  - [25_4_AI_PIPELINE_PILOT.md](./25_4_AI_PIPELINE_PILOT.md)
- It also considers the supporting narrow enforcement evidence from M24 where that evidence is required to judge post-generation value honestly.
- This sprint is a review only.
- It does not widen enforcement scope, implement new AI cleanup behavior, or start any later phase.

## Scope reviewed

This review assesses the current AI post-processing envelope only:

- generated-deck inputs
- admitted external-template matches only
- `alignment`
- `fontFamily`

The review does not assess:

- broad AI cleanup
- broad real-world generated-deck readiness
- unsupported classes such as `fontSize`, `lineSpacing`, `paragraphSpacing`, or `bulletIndent`
- layout redesign
- narrative rewrite
- unsupported structure repair

## Evidence considered

The review considered the current narrow Phase 6 path end to end:

1. M25.1 scope definition
   - AI post-processing is allowed only after admitted external-template matching
   - only `alignment` and `fontFamily` are in scope
   - unsupported generated-deck needs must block, noop, or report

2. M25.2 generated-deck corpus and failure taxonomy
   - admitted generated-deck-like cases
   - ambiguous overlap cases
   - rejected wrong-template cases
   - unsupported layout / rewrite / structure-repair cases
   - highly inconsistent generated-deck cases

3. M25.3 report contract
   - explicit eligible / blocked / out-of-scope reporting
   - admitted template anchor and family
   - applied, blocked, and untouched classes
   - untouched unsupported failure modes
   - explicit post-processing-only boundary

4. M25.4 pipeline pilot
   - eligible generated-deck workflow with actual enforcement
   - ambiguous blocked workflow
   - rejected blocked workflow
   - unsupported blocked workflow
   - highly inconsistent generated-deck workflow
   - deterministic repeated outputs

5. Supporting M24 evidence
   - the enforcement core is real
   - admitted external-template enforcement is deterministic
   - highly inconsistent admitted decks can still be handled narrowly and safely

## Currently proven AI post-processing envelope

The currently proven envelope is narrow but real:

- generated-deck input is evaluated against external template anchors
- only `admittedMatch` may proceed
- only `alignment` and `fontFamily` may be normalized
- ambiguous and rejected matches block cleanly
- unsupported generated-deck failure modes remain blocked or untouched
- reporting is explicit enough to explain why the workflow applied, blocked, or stopped

This is a real post-processing workflow.

It is not:

- broad AI cleanup
- generator-level intelligence
- narrative rewrite
- layout redesign
- structure repair

## Unsupported generated-deck failure modes

The following generated-deck failure modes remain unsupported:

- `unsupportedLayoutDrift`
- `unsupportedNarrativeRewriteExpectation`
- `unsupportedStructureRepairNeed`
- mixed supported and unsupported issue sets that require more than narrow normalization
- out-of-scope cleanup classes:
  - `fontSize`
  - `lineSpacing`
  - `paragraphSpacing`
  - `bulletIndent`

These unsupported realities are material. They prevent broad AI-cleanup positioning.

## Workflow reality assessment

**Assessment: real, deterministic, and narrow.**

The workflow is real because:

- there is an end-to-end path from generated-deck input to scope decision to enforcement where eligible to report output
- the path is backed by runtime helpers, corpus coverage, and direct pilot runs
- admitted, ambiguous, rejected, unsupported, and highly inconsistent cases are all distinguishable
- repeated runs are deterministic

The workflow is still narrow because:

- it depends on admitted external-template matching
- it supports only `alignment` and `fontFamily`
- it remains controlled-corpus evidence, not broad production proof

## Explainability assessment

**Assessment: sufficient for honest product explanation inside the narrow envelope.**

Current reporting can explain:

- whether AI post-processing was attempted
- whether the case was eligible, blocked, or out of scope
- whether template matching was admitted, ambiguous, or rejected
- which template anchor and family were admitted
- which classes were requested
- which supported classes were eligible
- which classes were actually applied
- which classes were blocked
- which unsupported failure modes remained untouched
- that CleanDeck acted only as a post-processing normalization layer

Blocked and unsupported cases are not hidden or softened into success language.

## Supported value assessment

**Assessment: real value exists, but only for a narrow use case.**

The current workflow provides real post-generation value when:

- an AI-generated deck still resembles a known admitted template family
- the deck’s remaining issues sit mainly inside `alignment` or `fontFamily`
- users need deterministic cleanup rather than redesign or rewrite

That value is meaningful because it:

- removes a specific class of post-generation formatting cleanup work
- keeps the workflow auditable
- avoids overclaiming broader AI capabilities

The current value is not broad enough to claim general AI deck cleanup.

## Commercial / product positioning assessment

**Assessment: narrower supporting position, not standalone primary product layer.**

The current AI workflow is too strong for `narrativeOnly` because:

- the workflow is real
- the workflow is deterministic
- the workflow produces actual normalization value in controlled generated-deck cases
- the reporting story is coherent and honest

The current AI workflow is not strong enough for `realProduct` because:

- the proven envelope is still very narrow
- the corpus remains controlled and partly synthetic
- unsupported generated-deck realities remain substantial
- the positioning would be misleading if presented as an independently broad AI layer

The honest positioning is therefore:

- AI post-processing is a real supporting capability
- it is commercially useful as an add-on to the core product
- it is not yet broad enough to stand as the primary product layer on its own

## Exact verdict

**Verdict: `addOn`**

The AI layer is currently a real workflow with real value, but only as a narrower supporting position.

It is not currently strong enough to stand as a standalone primary product layer.

## Exact positioning statement

The current AI layer is **not** a standalone real product layer.

It is currently a **narrower supporting add-on position**:

- real
- useful
- explainable
- deterministic
- but still bounded too tightly to lead product positioning on its own

## Exact unsupported boundary

Unsupported classes and behaviors remain out of scope:

- `fontSize`
- `lineSpacing`
- `paragraphSpacing`
- `bulletIndent`
- layout redesign
- narrative rewrite
- slide generation
- unsupported structure repair

They are not implied by this verdict and they are not covered by the current AI positioning claim.

## Exact product-truth boundary

Product truth does not expand beyond the proven envelope.

Current CleanDeck truth remains:

- audit-first deck QA tool with safe partial normalization
- not a template enforcement platform
- not an AI deck post-processing layer beyond the currently proven narrow envelope

The only additional conclusion justified here is that the current AI post-processing capability is credible as a narrow supporting add-on inside its proven boundary.
