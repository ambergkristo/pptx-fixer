# CleanDeck Next Direction Plan

Date: 2026-04-06
Status: Active execution plan for the next product track after M26 truth recovery
Owner: Product + runtime implementation

## Execution Status

- N1 product reframe: done
- N1 role-audit foundation: done
- N2 normalize mode plumbing: in progress
- N2 role-based font family / font size normalization MVP: in progress
- N3 template work: not started

## Why This Plan Exists

CleanDeck currently behaves like a deterministic PPTX audit tool with safe partial normalization.

That is useful, but it does not yet match the stronger user expectation:

- take a messy deck
- make it visually coherent
- preserve obvious title/body hierarchy
- avoid shrinking headings into body text
- optionally align the deck to a chosen brand system

The current engine is strongest at fixing measurable drift.
The next direction is to evolve it into a clearer three-mode product without collapsing into redesign or AI generation.

## Product Truth Going Forward

CleanDeck should be framed as three distinct capabilities, not one vague "fix everything" action.

### 1. Safe Cleanup

Purpose:
- repair deterministic formatting drift without changing the deck's intended structure

Includes:
- font drift cleanup inside safe equivalence groups
- font size drift cleanup inside safe equivalence groups
- paragraph spacing cleanup
- line spacing cleanup
- bullet indentation cleanup
- alignment cleanup

Does not include:
- brand enforcement
- hierarchy rebuilding
- template redesign
- content rewriting

User promise:
- "Clean obvious formatting mistakes while preserving the deck's original structure."

### 2. Normalize Deck

Purpose:
- make the deck visually coherent by normalizing text roles, not just drift counts

Includes:
- detect title / section title / subtitle / body / bullet / note / footer roles
- infer dominant style by role
- preserve hierarchy while converging inconsistent peers
- allow a chosen base font family across roles
- avoid shrinking headings into body style

Does not include:
- slide redesign
- content generation
- arbitrary re-layout

User promise:
- "Make this deck look like one presentation instead of a stitched mix of sources."

### 3. Apply Template

Purpose:
- apply a lightweight brand shell after cleanup/normalization

Includes:
- use a selected company template or brand preset
- add logo in a chosen safe location
- apply footer/header placement rules
- apply brand typography/color tokens where supported

Does not include:
- full layout reconstruction
- custom master recreation for every legacy deck shape

User promise:
- "Bring the cleaned deck closer to our company presentation style."

## Product Principles

1. Keep Safe Cleanup honest and conservative.
2. Put stronger normalization behind an explicit user choice.
3. Never call a deck "ready" if tracked categories are clean but hierarchy quality visibly collapses.
4. Treat role-aware normalization as the core next capability.
5. Treat template application as a thin brand layer, not a redesign engine.

## Target UX Model

The app should move from one generic fix flow to an explicit staged flow.

### Proposed primary flow

1. Choose file
2. Choose mode:
   - Safe cleanup
   - Normalize deck
   - Apply template
3. Optional settings by mode
4. Run
5. Review before/after by category plus mode-specific outcome
6. Download corrected PPTX

### Proposed Normalize Deck options

- Typography source:
  - Auto-detect from deck
  - Choose base font manually
- Hierarchy policy:
  - Preserve detected hierarchy
  - Tighten hierarchy
  - Rebuild hierarchy from dominant pattern
- Scope:
  - Whole deck
  - Selected slides later

### Proposed Apply Template options

- Template source:
  - Upload template
  - Choose saved brand preset
- Logo position:
  - Top left
  - Top right
  - Bottom left
  - Bottom right
- Footer style:
  - None
  - Minimal
  - Brand footer

## Core Runtime Gap To Solve First

The current engine still evaluates success mainly by tracked drift categories.

That creates false-positive product outcomes:

- category counts can go to zero
- but the deck can still feel over-compressed or visually uneven
- headings can converge too far toward body rhythm
- mixed-source role structure can still look wrong even when drift metrics close

So the next runtime foundation is not "more one-off fixes."
It is role-aware classification plus role-aware normalization.

## Execution Plan

This should be done in three sprints to keep momentum and avoid a long speculative branch.

### Sprint N1 - Product Reframe and Role Audit Foundation

Goal:
- make the current product honest as Safe Cleanup
- add the role-analysis foundation needed for Normalize Deck

Scope:
- rename current UI/UX copy from generic "fix deck" language to "safe cleanup"
- add internal text-role classification output for:
  - title
  - section_title
  - subtitle
  - body
  - bullet_list
  - note
  - footer
- add role-audit diagnostics and corpus fixtures for mixed-source decks
- add false-ready protection so visual hierarchy collapse cannot still surface as a strong success signal

Acceptance:
- current Safe Cleanup flow remains working
- role classification exists in machine-readable form
- at least one known false-positive mixed deck no longer reports an overly strong success state

### Sprint N2 - Normalize Deck MVP

Goal:
- ship the first real role-based normalization mode

Scope:
- add a `normalize` processing mode beside safe cleanup
- infer dominant style per detected role
- normalize font family and font size by role
- normalize paragraph/line spacing by role where safe
- preserve title/body hierarchy explicitly
- add user-selectable base font family:
  - Auto-detect
  - Selected brand font

Acceptance:
- realistic mixed-source decks improve visually beyond Safe Cleanup
- headings do not collapse into body size on target decks
- mixed-source font inconsistency improves materially in Normalize mode
- Safe Cleanup truth and protected boundary behavior do not regress

### Sprint N3 - Brand Preset and Template Apply Lite

Goal:
- let users push a cleaned/normalized deck toward their company style

Scope:
- add lightweight brand preset support
- add uploaded template/preset selection in UI
- support logo placement in one of four fixed safe positions
- support role-based font mapping from preset
- support footer/header placement rules with minimal safe application

Acceptance:
- a user can choose a brand preset or upload a template
- a corrected deck can receive basic company framing without corrupting text editability
- logo placement is deterministic and configurable
- output stays within supported surface limits and fails honestly when unsupported

## What We Are Not Doing In This Track

- AI rewrite
- slide generation
- automatic redesign
- arbitrary object re-layout
- chart restyling
- "make every deck perfect" claims

## Immediate Next Step

Continue Sprint N2 now.

The current implementation slice is:

1. ship `normalize` mode through UI, API, server, CLI, and runtime
2. keep `standard` and `minimal` behavior unchanged
3. normalize font family and font size by detected text role before moving to spacing-by-role

## Success Definition For This Track

The track is successful if CleanDeck becomes easy to understand as:

- Safe Cleanup for deterministic repairs
- Normalize Deck for visual coherence
- Apply Template for brand shell application

And if users can get a visibly more coherent deck without the current failure mode where tracked metrics are green but the deck still looks compressed or inconsistent.
