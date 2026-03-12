# Decision Log

## Template

Date:

Context:

Decision:

Options considered:

Why:

Impact:

Follow-up:

## 2026-03-12 - M4 Completion

Date:
2026-03-12

Context:
M4 Packaging / MVP Usability was completed. The product shell now includes CLI workflow, batch CLI support, audit-only mode, cleanup mode selection, and an HTTP upload / audit / fix / download wrapper.

Decision:
Close M4 with the current product shell and keep post-M4 hardening out of scope for this milestone.

Options considered:
- Extend M4 into browser UI and richer shell behavior
- Stop at CLI packaging only
- Close M4 after CLI plus minimal HTTP product shell

Why:
The delivered shell now makes the pipeline usable for non-technical testing without changing engine architecture or adding new fix logic. Additional work such as UI, auth, persistence, and storage lifecycle management is product hardening, not required for M4 acceptance.

Impact:
- M4 delivered:
  - CLI workflow
  - batch CLI support
  - audit-only mode
  - minimal vs standard cleanup modes
  - HTTP upload / audit / fix / download product shell
- Deferred beyond M4:
  - browser UI
  - storage cleanup policy
  - authentication
  - persistence
  - production multi-user hardening

Follow-up:
Start the next milestone or hardening phase from the existing product shell, not by changing audit/fix engine scope.

## 2026-03-12 - Product Branding

Date:
2026-03-12

Context:
Product branding for PPTX Fixer tool.

Decision:
User-facing product name will be "CleanDeck".

Why:
Clear meaning, no strong conflicts, fits product purpose
(PowerPoint cleanup / normalization tool).

Impact:
UI, website, beta testing and messaging will use CleanDeck.
Repository remains pptx-fixer.

Follow-up:
Add logo + brand usage to product shell UI.
