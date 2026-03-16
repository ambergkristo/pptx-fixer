# Decision Log

## Template

Date:

Context:

Decision:

Options considered:

Why:

Impact:

Follow-up:

## 2026-03-16 - Active Architecture Baseline

Date:
2026-03-16

Context:
The repository now contains a working single-service product shell with an Express API, a React browser UI, shared TypeScript audit / fix / export packages, and a top-level Node CLI entry. A legacy Python audit prototype is still present in the repo.

Decision:
Treat the Node/TypeScript shell and package modules as the active product architecture. Do not treat the Python audit prototype as current milestone scope unless it is explicitly revived.

Options considered:
- Keep both runtime paths equally active in planning
- Treat the Python path as the active baseline
- Treat the Node/TypeScript path as the active baseline

Why:
Current tests, deployment shape, browser UI, API routes, and CLI entry all run through the Node/TypeScript path. Keeping both paths implicitly active would create planning drift and unclear ownership.

Impact:
- control docs must describe the active shell as Express + React + shared TypeScript engine packages
- spacing, alignment, and color capabilities in older prototype code must not be counted as delivered product-shell functionality
- the Python path is legacy/reference code until a deliberate decision changes that

Follow-up:
If the Python prototype is no longer needed, archive or remove it later. Until then, keep scope decisions anchored to the active Node path.

## 2026-03-16 - Adopt Milestone Plan v2

Date:
2026-03-16

Context:
The repository needed a single official phased plan that reflects the current shipped baseline and clearly separates the current UX bottleneck from later engine, audit, usability, and SaaS work.

Decision:
Adopt [MILESTONE_PLAN_V2.md](/C:/Users/Kasutaja/pptx-fixer/docs/control/MILESTONE_PLAN_V2.md) as the official milestone execution plan. Mark M5 - Product Shell UX Fit as active.

Options considered:
- Continue using the older milestone list as the main execution plan
- Keep milestone references distributed across several control docs
- Adopt one new official phased plan and align the existing control docs to it

Why:
The product baseline is now beyond the original M0-M4 framing. The next work needs a single authoritative plan that matches the actual product state and keeps M6+ out of active scope.

Impact:
- control docs should reference MILESTONE_PLAN_V2.md as the official phased plan
- M5 is the only active implementation milestone
- M6, M7, M8, and M9 remain future milestones only

Follow-up:
Use M5 for the next execution cycle and keep later milestones out of implementation until M5 is signed off.

## 2026-03-16 - Product Shell Compactness Rule

Date:
2026-03-16

Context:
The current browser UI uses large controls, large cards, and generous vertical spacing. That makes the core CleanDeck workflow harder to scan and increases the chance that the main action path requires scrolling on desktop.

Decision:
Adopt a no-scroll-first desktop rule for the main workflow. Major controls must be reduced in size, oversized cards and buttons should be avoided, and unnecessary vertical stacking should be removed.

Options considered:
- Keep the current spacious shell layout
- Tighten the layout only after beta feedback
- Make compactness an explicit current planning requirement

Why:
CleanDeck is a narrow utility flow: upload, audit, fix, review, download. Users should understand and act on that flow immediately without scrolling through oversized chrome.

Impact:
- milestone planning now includes a product-shell UX fit phase
- acceptance criteria now include first-screen visibility for the main desktop workflow
- future shell work should prefer compact density over decorative size

Follow-up:
Use the next session to tighten the current browser layout before adding new shell features.

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
