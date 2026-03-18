# Acceptance Criteria

## Control Reset Note

- The official active phased roadmap and working statute is [11_TRUTH_RESET_ROADMAP.md](/C:/Users/Kasutaja/pptx-fixer/11_TRUTH_RESET_ROADMAP.md).
- The official acceptance corpus definition is [12_ACCEPTANCE_CORPUS.md](/C:/Users/Kasutaja/pptx-fixer/docs/control/12_ACCEPTANCE_CORPUS.md).
- The older milestone acceptance list below is historical baseline reference and must not override the truth-reset roadmap.
- Current active phase: Phase 0 - Truth Reset and Control Recovery.
- Current active sprint direction: M18.
- UI maturity must not be treated as proof of engine readiness.
- Acceptance claims must be grounded in the official corpus definition before they widen.

## Official Plan Reference

- The official phased execution plan is [11_TRUTH_RESET_ROADMAP.md](/C:/Users/Kasutaja/pptx-fixer/11_TRUTH_RESET_ROADMAP.md).
- The official acceptance corpus authority for MVP proof is [12_ACCEPTANCE_CORPUS.md](/C:/Users/Kasutaja/pptx-fixer/docs/control/12_ACCEPTANCE_CORPUS.md).
- MILESTONE_PLAN_V2.md is historical reference only.
- Current active milestone direction is Phase 0 / M18.

## M0

- interviews / responses collected
- deck corpus plan is defined
- problem signal is strong enough to proceed

## M1

- pptx ingest works
- audit summary works for the active baseline rules
- current audit output is deterministic and understandable
- M1 acceptance does not imply spacing, alignment, or color detection unless those rules are explicitly implemented in the active product path

## M2

- safe autofix works for the active baseline rules
- no corruption
- deterministic output
- risky edits are skipped or surfaced as warnings
- M2 acceptance does not imply spacing, alignment, or color fixes unless those fixes are explicitly implemented

## M3

- corrected pptx export works
- exported file is a valid zip
- core pptx entries are present
- exported deck reloads
- slide count matches the input deck

## M4

- CLI flow works
- browser shell works
- user can upload a pptx, run audit / cleanup, and download output
- shell remains separate from the audit / fix / export modules

## M5

- main desktop workflow is visible on first load without page scroll on a typical laptop viewport
- main desktop workflow fits on one screen without unnecessary scrolling
- upload, mode selection, audit summary, cleanup action, and output area are visible in one first-screen layout
- major controls are reduced in size
- oversized buttons, oversized cards, and unnecessary vertical stacking are removed from the main flow

## M6

- text tokens preserved after cleanup
- XML ordering preserved
- regression coverage expanded
- corpus expanded

## M7

- detect paragraph spacing drift
- detect bullet spacing drift
- detect alignment inconsistency
- detect color inconsistency

## M8

- batch cleanup
- stronger audit-only mode
- before/after summary improvements

## M9

- service-readiness scope is defined for accounts, usage tracking, cloud storage, and API access
