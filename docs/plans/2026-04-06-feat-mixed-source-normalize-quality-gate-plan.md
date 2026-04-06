---
title: feat: Mixed-Source Normalize Quality Gate
type: feat
status: active
date: 2026-04-06
---

# feat: Mixed-Source Normalize Quality Gate

## Overview

CleanDeck's new three-mode product direction is now implemented:

- `Safe cleanup`
- `Normalize deck`
- `Template apply`

That track is complete, but one material product gap remains:

- `Normalize deck` can still reach green category counts while the output remains visually compressed or uneven on realistic mixed-source slides

This plan defines the next implementation track to close that gap with the fewest practical sprints.

The goal is not to redesign slides.
The goal is to make `Normalize deck` materially more trustworthy on real mixed-source decks and to stop overstating `ready` when hierarchy quality is still weak.

## Problem Statement / Motivation

The current runtime is strong at deterministic cleanup and basic role-based normalization, but it still makes success decisions mainly from tracked category counts.

That leaves a product-quality hole:

- spacing/font drift can close numerically
- but title/body rhythm can still look too compressed
- local card groups can still converge too aggressively
- mixed-source decks can still feel stitched together even after `normalize`
- the UI can still signal `ready` too early for a human user's expectation

This matters because the user's mental model is:

- upload messy deck
- unify visual system
- preserve hierarchy
- download something presentation-ready

If the app says `ready` while humans still see over-compression or hierarchy collapse, product trust degrades quickly.

## Proposed Solution

Ship the next track in two sprints.

### Sprint Q1 - Honest Ready Gate and Mixed-Source Truth Corpus

Goal:
- stop `Normalize deck` from overstating success on visually weak output

Scope:
- admit or formalize 2-3 realistic mixed-source validation decks
- add a hierarchy-quality audit layer on top of existing role analysis
- detect at least these false-ready signals:
  - heading/body size ratio collapse
  - heading spacing compressed into body rhythm
  - multi-card local rhythm flattened too aggressively
  - cross-slide role variance still materially high after normalize
- surface a mode-aware result state:
  - `ready`
  - `improved_manual_review`
  - `manual_review_recommended`
- keep `Safe cleanup` behavior and boundary honesty unchanged

Acceptance:
- at least one known false-positive mixed deck no longer returns `ready`
- result state is backed by measurable hierarchy-quality checks, not copy changes
- existing protected boundary decks stay honest

### Sprint Q2 - Mixed-Source Normalize Closure

Goal:
- materially improve the runtime so realistic mixed-source decks actually pass the new gate more often

Scope:
- strengthen role-based normalization in `normalize` mode for realistic card/memo/list surfaces
- add role-cluster baselines that work across:
  - title
  - section title
  - subtitle
  - body
  - bullet list
- tighten local convergence rules so headings do not collapse toward body text
- add slide-level rhythm guards so paragraph/line spacing normalization preserves card hierarchy
- only converge body/bullet groups when structure is strong enough
- add before/after mixed-source validation tables for target decks

Acceptance:
- target mixed-source decks improve materially in visual consistency
- heading/body hierarchy stays intact
- fewer decks fall into unresolved paragraph/line spacing/manual-review outcomes after `normalize`
- `Safe cleanup`, boundary decks, and hostile stress surfaces do not regress materially

## Technical Considerations

- The current foundations already exist in:
  - `packages/audit/textRoleAudit.ts`
  - `packages/fix/roleBasedTypographyFix.ts`
  - `packages/fix/roleBasedSpacingFix.ts`
  - `packages/fix/processingModeSummary.ts`
  - `apps/product-shell-ui/src/lib/uploadResultViewModel.ts`
- The next gap is not generic "more fixes"; it is a stronger relationship between:
  - role detection
  - role baseline inference
  - hierarchy-quality scoring
  - user-facing readiness semantics
- The readiness decision should remain deterministic and explainable.
- Do not add AI generation, style guessing from internet data, or redesign heuristics.

## System-Wide Impact

- **Interaction graph**: `normalize` mode will no longer be judged only by residual drift counts. `textRoleAudit` feeds hierarchy-quality checks, which feed mode-aware summary generation, which feeds UI status and download eligibility language.
- **Error propagation**: unsupported or ambiguous decks should degrade toward `improved_manual_review`, not silently green. This is a product-truth decision, not an exception flow.
- **State lifecycle risks**: result-state changes affect UI messaging, CTA visibility, and user expectations. Keep result semantics aligned across runtime, API, CLI, and UI.
- **API surface parity**: `processingModeSummary`, shell route responses, CLI summaries, and UI view models must all expose the same readiness meaning.
- **Integration test scenarios**:
  - mixed-source deck improves categories but still fails hierarchy gate
  - mixed-source deck passes both category closure and hierarchy gate
  - boundary deck remains non-green for the right reason
  - `safe cleanup` remains conservative while `normalize` is stricter and more capable

## Implementation Phases

### Phase 1: Corpus and Quality Gate

Deliverables:
- add realistic mixed-source truth fixtures
- add hierarchy-quality score or rule bundle
- add result-state plumbing for `improved_manual_review`
- add tests proving false-ready suppression

Likely files:
- `packages/audit/textRoleAudit.ts`
- `packages/audit/pptxAudit.ts`
- `packages/fix/processingModeSummary.ts`
- `apps/product-shell-ui/src/lib/uploadResultViewModel.ts`
- `tests/normalizeMode.test.ts`
- `tests/processingModeSummary.test.ts`
- `tests/uploadResultViewModel.test.ts`

### Phase 2: Runtime Convergence Improvements

Deliverables:
- strengthen role-based typography/spacing convergence on mixed-source decks
- add local rhythm guards for cards and memo-style text blocks
- add mixed-source validation fixtures and before/after proof

Likely files:
- `packages/fix/roleBasedTypographyFix.ts`
- `packages/fix/roleBasedSpacingFix.ts`
- `packages/fix/runAllFixes.ts`
- `tests/normalizeMode.test.ts`
- mixed-source validation tests to be added with committed fixture names

### Phase 3: Product Truth Pass

Deliverables:
- align UI summary language with new readiness states
- ensure `download fixed PPTX` remains available when output is improved but not green, if product policy allows it
- add a concise user-facing explanation for why manual review is still recommended

Likely files:
- `apps/product-shell-ui/src/components/StatusPanel.tsx`
- `apps/product-shell-ui/src/components/UploadResultScreen.ts`
- `apps/product-shell-ui/src/lib/uploadResultViewModel.ts`
- `tests/uploadResultScreen.test.ts`

## Acceptance Criteria

### Functional Requirements

- [ ] `Normalize deck` does not return `ready` for known visually compressed mixed-source false positives.
- [ ] The runtime exposes a deterministic hierarchy-quality signal based on role relationships.
- [ ] `Normalize deck` materially improves at least one realistic mixed-source target deck beyond the current `main` behavior.
- [ ] Title/body hierarchy remains intact on target mixed-source decks after normalize.
- [ ] `Safe cleanup` behavior does not widen into brand or redesign logic.

### Non-Functional Requirements

- [ ] Readiness logic stays deterministic and explainable.
- [ ] No validator weakening and no report-only relabeling.
- [ ] Boundary/manual-review decks remain honest.

### Quality Gates

- [ ] Mixed-source regression tests exist for false-ready suppression and true-ready success.
- [ ] Existing normalize, product shell, and summary tests remain green.
- [ ] UI build remains green after status-model changes.

## Success Metrics

Use exact before/after tables for each target deck.

Required metrics:
- heading/body dominant size ratio
- heading/body paragraph spacing ratio
- heading/body line spacing ratio
- per-role residual font family count
- per-role residual font size count
- per-role residual paragraph spacing count
- per-role residual line spacing count
- final result state:
  - `ready`
  - `improved_manual_review`
  - `manual_review_recommended`

The track is successful if:
- false `ready` outcomes are eliminated on known mixed-source targets
- at least one target mixed-source deck newly reaches truthful `ready`
- the remaining non-green decks fail for honest, narrower reasons

## Dependencies & Risks

Dependencies:
- stable realistic mixed-source fixtures
- consistent role classification on those fixtures
- UI agreement on new intermediate result state

Risks:
- too-weak gate only renames states without improving runtime
- too-strong gate turns many useful outputs into manual review
- overfitting to one external deck instead of general mixed-source behavior
- role heuristics drift between audit and fixer paths

Mitigation:
- require paired gate + runtime work across the two sprints
- validate on multiple mixed-source decks, not one
- keep protected corpus and boundary tests in every iteration

## References & Research

### Internal References

- `docs/product/2026-04-06-cleandeck-next-direction-plan.md`
- `packages/audit/textRoleAudit.ts`
- `packages/fix/roleBasedTypographyFix.ts`
- `packages/fix/roleBasedSpacingFix.ts`
- `packages/fix/processingModeSummary.ts`
- `apps/product-shell-ui/src/lib/uploadResultViewModel.ts`
- `tests/normalizeMode.test.ts`
- `tests/processingModeSummary.test.ts`
- `tests/productShell.test.ts`

### Related Product Truth

- The previous track is complete.
- This track exists to close the gap explicitly called out in the previous plan's immediate next step:
  - stronger `Normalize deck` on realistic mixed-source decks
  - hierarchy-quality gate
  - clearer product truth around non-green but improved outputs

## Out of Scope

- AI rewriting
- automatic slide redesign
- arbitrary object movement or re-layout
- chart restyling
- new template-engine breadth
- full brand-token system expansion in this track

## Recommended Start Order

1. Build the mixed-source truth corpus and false-ready tests.
2. Ship the hierarchy-quality gate and new result state.
3. Improve normalize runtime until at least one target mixed-source deck clears the new gate.
4. Only then decide whether a richer brand-token track is needed.
