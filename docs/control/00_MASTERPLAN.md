# PPTX FIXER - Masterplan

## Control Note

- [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md) is the official active phased roadmap and working statute.
- This masterplan remains product-definition context, but sprint sequencing is governed by the truth-reset roadmap statute.

## Product Thesis

PPTX Fixer is a tool for cleaning up existing PowerPoint files.

It:

- audits the deck
- finds formatting drift
- fixes safe issues only
- preserves content and structure

## Input

- one `.pptx` file

## Output

- corrected `.pptx`
- fix report
- warnings

## MVP Scope

- pptx parsing
- deck lint report
- font normalization
- alignment cleanup
- spacing cleanup
- repeated object spacing normalization
- color consistency checks
- corrected pptx export

## Out of Scope

- slide generation
- narrative rewrite
- template conversion
- redesign
- chart restyling
- SmartArt transformations

## Product Principles

1. Reliability over novelty
2. Safe fixes only
3. Preserve structure
4. Warn instead of risky edit
5. No layout drift
6. Original file untouched
7. Deterministic engine

## Product Shell UX Guardrail

- The main desktop workflow should be visible on one screen on first load.
- The main desktop workflow must fit on one screen without unnecessary scrolling.
- Major controls must be compact; avoid oversized buttons, oversized cards, and unnecessary vertical stacking.
- This UX rule applies to the product shell only and does not expand engine scope beyond audit + safe autofix + report + corrected pptx.

## Official Execution Plan

- The official phased plan and working statute is [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- The current active milestone direction is Phase 0 / M18 - Truth Reset and Control Recovery.
- [MILESTONE_PLAN_V2.md](./MILESTONE_PLAN_V2.md) remains historical reference only and must not override the truth-reset roadmap.
