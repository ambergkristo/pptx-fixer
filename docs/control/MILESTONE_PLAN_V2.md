# CleanDeck - Milestone Plan v2

## Baseline

Current product state:

- React browser UI
- Express API
- shared audit / fix / export engine
- regression tests
- safe cleanup for font family and font size

Known constraints:

- UI density too low
- workflow does not yet fit comfortably on one screen
- storage lifecycle missing
- audit engine scope still narrow

## M5 - Product Shell UX Fit

Goal:
Make CleanDeck a compact workspace tool where the main workflow fits on one screen.

Acceptance criteria:

- desktop main workflow fits on one screen
- main desktop workflow fits without unnecessary scrolling
- buttons and cards are compact
- major controls are not oversized
- excessive vertical card stacking is reduced
- progress shown as inline status
- drag-and-drop upload works
- temp and output lifecycle handling is defined and implemented for the current shell
- utility-tool visual direction, not dashboard style

Sprint tasks:

- layout refactor
- compact desktop-first workflow pass
- inline progress treatment
- drag-and-drop upload
- temp and output lifecycle handling

## M6 - Engine Robustness

Goal:
Strengthen PPTX processing safety and reliability.

Acceptance criteria:

- text tokens preserved after cleanup
- XML ordering preserved
- regression coverage expanded
- corpus expanded
- XML safety guards added
- visual integrity warnings added for suspicious output conditions

Sprint tasks:

- corpus expansion
- XML safety guards
- text fidelity protection hardening
- regression hardening
- visual integrity warnings

## M7 - Audit Expansion

Goal:
Expand audit coverage before adding more fixes.

Acceptance criteria:

- detect paragraph spacing drift
- detect bullet spacing drift
- detect alignment inconsistency
- detect color inconsistency

Sprint tasks:

- paragraph spacing audit
- bullet spacing audit
- alignment audit
- color audit

## M8 - Usability Features

Goal:
Improve practical usage and reporting.

Acceptance criteria:

- batch cleanup
- stronger audit-only mode
- before/after summary improvements

Sprint tasks:

- batch processing
- audit-only strengthening
- change summary improvements

## M9 - SaaS Readiness

Goal:
Prepare the product for service operation.

Acceptance criteria:

- service architecture decisions are documented
- account model is defined
- usage tracking approach is defined
- storage approach is defined
- API access approach is defined

Sprint tasks:

- accounts
- usage tracking
- cloud storage
- API access

Possible scope:

- accounts
- usage tracking
- cloud storage
- API access

## Development Rules

- engine scope does not expand without corpus validation
- UI must not become a dashboard
- fix pipeline must remain fail-safe
- text fidelity must always be preserved

## Next Active Milestone

M5 - Product Shell UX Fit
