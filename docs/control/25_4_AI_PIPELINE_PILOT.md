# CleanDeck - AI Pipeline Pilot

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It validates the current narrow AI post-processing workflow using:
  - [25_1_AI_POST_PROCESSING_SCOPE_DEFINITION.md](./25_1_AI_POST_PROCESSING_SCOPE_DEFINITION.md)
  - M25.2 generated-deck corpus and failure-mode taxonomy
  - M25.3 post-processing report contract
  - the existing admitted external-template enforcement core
- It is a controlled pilot only.
- It does not widen enforcement scope, add AI cleanup behavior, approve unsupported classes, or start M25.5.

## Workflow scope tested

This pilot tests one narrow workflow only:

generated-deck input
-> external template match evaluation
-> AI post-processing scope decision
-> current enforcement core where eligible
-> post-processing report output
-> explicit blocked or out-of-scope handling where not eligible

The workflow scope remains:

- admitted external-template matches only
- `alignment`
- `fontFamily`

It does not include:

- `fontSize`
- `lineSpacing`
- `paragraphSpacing`
- `bulletIndent`
- layout redesign
- narrative rewrite
- slide generation
- unsupported structure repair

## Generated-deck inputs used

The pilot used the current controlled `ai-generated` corpus:

- `ai-generated-aptos-quarterly-font-family-drift`
- `ai-generated-calibri-product-plan-font-family-drift`
- `ai-generated-aptos-quarterly-layout-redesign-needed`
- `ai-generated-aptos-quarterly-inconsistent-font-family-drift`

Supporting external template anchors:

- `aptos-template-anchor.pptx`
- `aptos-template-anchor-multislide.pptx`
- `aptos-template-anchor-inconsistent.pptx`
- `aptos-template-anchor-right-conflict.pptx`
- `font-family-template-anchor.pptx`
- `font-family-template-anchor-multislide.pptx`
- `template-placeholders.pptx`

## Case coverage

The pilot covered all required workflow states:

1. Eligible generated-deck workflow
   - `ai-generated-aptos-quarterly-font-family-drift`
   - admitted external template match
   - `fontFamily` requested
   - enforcement applied
   - report output coherent

2. Ambiguous workflow
   - `ai-generated-aptos-quarterly-font-family-drift`
   - conflicting Aptos anchor set
   - template match stayed `ambiguousMatch`
   - workflow blocked cleanly

3. Rejected workflow
   - `ai-generated-calibri-product-plan-font-family-drift`
   - wrong external template family
   - template match stayed `rejectedMatch`
   - workflow blocked cleanly

4. Unsupported generated-deck workflow
   - `ai-generated-aptos-quarterly-layout-redesign-needed`
   - admitted template family
   - unsupported `layoutRedesignRequired`
   - `layoutRedesign` remained untouched and unsupported

5. Highly inconsistent generated-deck workflow
   - `ai-generated-aptos-quarterly-inconsistent-font-family-drift`
   - admitted inconsistent Aptos family
   - `fontFamily` requested with out-of-scope `fontSize`
   - enforcement applied safely for `fontFamily`
   - `fontSize` remained untouched

## Workflow results

### Eligible workflow result

Observed result:

- scope decision: `aiPostProcessingEligible`
- template match: `admittedMatch`
- admitted template anchor: `aptos-template-anchor.pptx`
- enforcement status: `enforcementApplied`
- applied classes: `fontFamily`
- blocked classes: none

What current post-processing actually normalized:

- `fontFamily` only

What it did not claim:

- no generator behavior
- no rewrite behavior
- no layout redesign

### Ambiguous workflow result

Observed result:

- scope decision: `aiPostProcessingBlocked`
- template match: `ambiguousMatch`
- no admitted template anchor
- enforcement was not attempted
- blocked classes: `fontFamily`

What remained blocked:

- the deck was not normalized because template admission was not safe enough

### Rejected workflow result

Observed result:

- scope decision: `aiPostProcessingBlocked`
- template match: `rejectedMatch`
- no admitted template anchor
- enforcement was not attempted
- blocked classes: `fontFamily`

What remained blocked:

- the deck did not belong to the admitted template family and was correctly rejected

### Unsupported workflow result

Observed result:

- scope decision: `aiPostProcessingBlocked`
- template match: `admittedMatch`
- admitted template anchor: `aptos-template-anchor-multislide.pptx`
- enforcement was not attempted
- blocked classes: `alignment`
- untouched out-of-scope classes: `layoutRedesign`
- untouched unsupported failure modes: `layoutRedesignRequired`

What remained untouched:

- layout redesign need
- unsupported generated-deck failure mode

### Highly inconsistent workflow result

Observed result:

- scope decision: `aiPostProcessingEligible`
- template match: `admittedMatch`
- admitted template anchor: `aptos-template-anchor-inconsistent.pptx`
- enforcement status: `enforcementApplied`
- applied classes: `fontFamily`
- untouched out-of-scope classes: `fontSize`
- verification:
  - `fontDriftBefore: 2 -> 0`
  - `alignmentDriftBefore: 0 -> 0`

What current post-processing actually normalized:

- `fontFamily` only

What remained untouched:

- `fontSize`

## What current post-processing could actually normalize

Inside this pilot, current post-processing could normalize only:

- `fontFamily` in admitted generated-deck cases
- `alignment` remains inside the proven envelope, but this pilot’s end-to-end admitted cases were driven primarily through `fontFamily`

The workflow proves that CleanDeck can sit after generated-deck creation only as a narrow post-processing normalization layer, not as a general AI cleanup engine.

## What remained blocked or untouched

The pilot shows that the current workflow still blocks or leaves untouched:

- ambiguous template matches
- rejected template matches
- layout redesign expectations
- narrative rewrite expectations
- unsupported structure-repair needs
- out-of-scope classes such as `fontSize`, `lineSpacing`, `paragraphSpacing`, and `bulletIndent`

Blocked cases remained blocked. Unsupported needs remained untouched. The workflow did not soften them into success language.

## Deterministic output assessment

Deterministic repeated workflow outputs were confirmed.

Observed result:

- repeated report summaries for the same highly inconsistent generated-deck input were identical under JSON serialization
- repeated admitted / blocked decisions remained stable across reruns

## Pilot conclusion

The workflow evidence is strong enough to support the AI post-processing claim narrowly on controlled generated-deck inputs only.

That narrow claim is:

- CleanDeck can sit after generated-deck creation as a post-processing normalization layer
- only when external template admission is safe
- only for the currently proven narrow envelope
- only with explicit blocked and untouched handling outside that envelope

This pilot is not evidence for:

- broad AI deck cleanup
- broad real-world generated-deck readiness
- generator-level intelligence
- layout redesign
- narrative rewrite
- unsupported structure repair

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

## Exact product-truth boundary

Product truth does not expand beyond the proven envelope.

Current CleanDeck truth remains:

- audit-first deck QA tool with safe partial normalization
- not a template enforcement platform
- not an AI deck post-processing layer beyond the currently proven narrow envelope

## Exact approval boundary

M25.5 is **not approved by this sprint**.
