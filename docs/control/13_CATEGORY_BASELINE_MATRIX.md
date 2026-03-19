# CleanDeck - Category Baseline Matrix

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- The official report truth gate that applies this matrix is [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It defines the official Phase 0 / M18.3 baseline matrix for evaluating the six cleanup categories against the acceptance corpus.
- It does not define the report truth gate, readiness label rules, or Phase 1+ implementation work.

## Purpose

This matrix freezes the honest pre-closure baseline for the six MVP cleanup categories so later proof cannot confuse:

- visible improvement with closure
- UI or report polish with engine proof
- report detection with normalization success
- eligible deck behavior with unsafe or ineligible deck behavior

## Current truth guardrails

- Category proof must be grounded in the admitted acceptance corpus, not isolated demos.
- A category is not closed because the UI looks polished or because the report names the issue.
- Detection evidence and normalization evidence must be recorded separately.
- Unsafe or ineligible decks are boundary evidence, not automatic closure failures and not automatic proof of success.
- Clean reference decks are mandatory no-regression evidence and must not be treated as hostile proof.
- Hostile stress proof is mandatory before any category can be treated as closed.

## Current repo grounding

The current tracked corpus inventory in [testdata/corpus/manifest.json](../../testdata/corpus/manifest.json) and [testdata/corpus/README.md](../../testdata/corpus/README.md) informs pressure areas but does not replace corpus admission or class authority.

Current inventory implications:

- `simple` inventory is best suited to clean-reference preservation checks and limited font/size baselines.
- `mixed-formatting` and `bullet-heavy` inventory is best suited to mixed real-world evaluation unless a specific deck is formally admitted as hostile.
- `template-heavy`, `field-node`, and grouped-shape cases are best suited to edge-case / unsafe-case boundary evidence unless a specific deck is formally admitted as eligible.
- `large-decks` inventory is robustness pressure only and is not closure proof by itself.

## Baseline status vocabulary

- `Unproven`: no category-level corpus proof yet exists for truthful closure claims.
- `Partially demonstrated`: limited evidence exists on some eligible decks, but not enough across clean, mixed, and hostile classes to claim closure.
- `Materially improved but not closed`: repeated reduction is visible in some eligible decks, but hostile closure, safety proof, or no-regression proof is still incomplete.
- `Not applicable as a closure target in unsafe-case decks`: the deck class may still provide boundary evidence, but successful normalization is not the required truthful outcome.

## Category baseline matrix

### 1. Font normalization

What the category covers:
- safe normalization of explicit font-family drift in text runs and paragraphs
- convergence toward deck-consistent font usage without rewriting structure or intent
- preservation of inherited formatting behavior where explicit overrides are sparse

Which corpus classes must exercise it:
- clean reference decks
- mixed real-world decks
- hostile stress-test decks
- edge-case / unsafe-case decks as boundary evidence only

What counts as meaningful improvement:
- explicit font-family drift is reduced on eligible decks
- text content, token order, and editability remain intact
- clean reference decks are not made worse

What does not count as proof:
- report-only detection of font inconsistency
- one-off improvements on a narrow demo deck
- a `ready` label without category-specific before/after evidence
- forced edits on unsafe decks that hide risk

What evidence is still required for closure:
- admitted clean, mixed, and hostile decks with category-specific before/after evidence
- no-regression evidence on clean decks
- repeated success on eligible mixed decks
- hostile stress evidence showing reduction without structural damage

What current baseline status should be recorded honestly now:
- `Partially demonstrated`
- The roadmap and historical control docs support a credible limited baseline for font normalization, but hostile closure is not proven.

What future milestones must prove before the category can be treated as closed:
- Phase 1 must show category-level proof across eligible mixed and hostile decks
- M21.1 and later proof must confirm that hostile reruns still hold after closure work

### 2. Size normalization

What the category covers:
- safe normalization of explicit font-size drift across runs and paragraphs
- convergence toward deck-consistent text sizing without changing content hierarchy by force
- preservation of structure and editability while reducing size inconsistency

Which corpus classes must exercise it:
- clean reference decks
- mixed real-world decks
- hostile stress-test decks
- edge-case / unsafe-case decks as boundary evidence only

What counts as meaningful improvement:
- explicit size drift is reduced on eligible decks
- hierarchical intent is not flattened by force
- clean decks remain stable and auditably safe

What does not count as proof:
- size inconsistency being detected but not safely normalized
- a small demo where size drift is the only problem
- improvements that only hold on easy decks
- risky edits on template or placeholder structures

What evidence is still required for closure:
- category-specific before/after evidence on admitted clean, mixed, and hostile decks
- no-regression proof on good decks
- repeated eligible-deck success beyond isolated font-only cases
- hostile evidence showing size reduction without structural harm

What current baseline status should be recorded honestly now:
- `Partially demonstrated`
- Historical baseline documents support limited size-normalization proof, but corpus-wide hostile closure is not established.

What future milestones must prove before the category can be treated as closed:
- Phase 1 must show category-level closure across eligible mixed and hostile decks
- Phase 2 proof must confirm that truthful messaging reflects only what the closure evidence supports

### 3. Alignment cleanup

What the category covers:
- safe cleanup of explicit paragraph alignment drift where alignment intent is clear
- reduction of inconsistent left, center, right, or justified paragraph properties
- preservation of deliberate layout asymmetry and structure

Which corpus classes must exercise it:
- clean reference decks as no-regression evidence
- mixed real-world decks
- hostile stress-test decks
- edge-case / unsafe-case decks as safety-boundary evidence

What counts as meaningful improvement:
- explicit alignment drift is reduced on eligible decks
- intentional asymmetry, placeholder behavior, and grouped content are not damaged
- before/after evidence shows real property cleanup rather than cosmetic movement

What does not count as proof:
- report detection without successful safe normalization
- visual claims that slides merely "look straighter"
- moving objects or layouts instead of cleaning paragraph-level alignment safely
- success only on trivial or non-adversarial examples

What evidence is still required for closure:
- admitted mixed and hostile decks with alignment-specific before/after evidence
- clean-deck no-regression evidence
- boundary evidence on grouped-shape, template-heavy, and field-node risks
- repeated runs showing deterministic safe behavior

What current baseline status should be recorded honestly now:
- `Unproven`
- The current control evidence does not support category-level closure for alignment cleanup.

What future milestones must prove before the category can be treated as closed:
- M19.1 must classify alignment failure modes across the corpus
- M19.2 must show safe alignment normalization closure
- M19.5 must lock regression and proof quality

### 4. Bullet / indent cleanup

What the category covers:
- safe cleanup of bullet marker drift, indentation drift, and hanging-indent inconsistency
- preservation of nested list structure and list semantics
- normalization only where bullet intent is clear and safe

Which corpus classes must exercise it:
- clean reference decks as no-regression evidence when lists are present
- mixed real-world decks
- hostile stress-test decks
- edge-case / unsafe-case decks as safety-boundary evidence

What counts as meaningful improvement:
- inconsistent bullet markers or indent levels are reduced on eligible decks
- nested hierarchy remains intact
- list structure remains editable and semantically stable

What does not count as proof:
- report-only bullet detection
- forcing all lists into a uniform style regardless of source structure
- success only on flat single-level lists
- any cleanup that flattens or damages nested list intent

What evidence is still required for closure:
- admitted mixed and hostile list-heavy decks with before/after category proof
- clean-deck no-regression evidence where bullets already behave correctly
- boundary evidence for risky placeholder, grouped, and field-node scenarios
- repeated deterministic safe cleanup on nested lists

What current baseline status should be recorded honestly now:
- `Unproven`
- The current repo has list-heavy inventory, but category-level closure proof is not established.

What future milestones must prove before the category can be treated as closed:
- M19.3 must show bullet symbol normalization closure
- M19.4 must show indent normalization closure
- M19.5 must harden regressions and proof quality

### 5. Line spacing cleanup

What the category covers:
- safe cleanup of line-height drift within paragraphs or list items
- reduction of inconsistent line spacing where paragraph intent remains clear
- preservation of layout safety and editability

Which corpus classes must exercise it:
- clean reference decks as no-regression evidence when spacing is already healthy
- mixed real-world decks
- hostile stress-test decks
- edge-case / unsafe-case decks as safety-boundary evidence

What counts as meaningful improvement:
- explicit line-spacing drift is reduced on eligible decks
- text remains readable and editable
- cleanup does not cause clipping, overflow, or structural damage

What does not count as proof:
- line-spacing drift being detected in the report
- visual compacting without category-specific before/after evidence
- improvements on decks that do not stress spacing meaningfully
- cleanup that harms layout integrity to improve labels

What evidence is still required for closure:
- admitted mixed and hostile decks with line-spacing-specific before/after proof
- no-regression evidence on clean decks
- boundary evidence on risky template and grouped-text cases
- repeated deterministic behavior with safety guardrails

What current baseline status should be recorded honestly now:
- `Unproven`
- Current control evidence does not support closure for line spacing cleanup.

What future milestones must prove before the category can be treated as closed:
- M20.1 must classify line-spacing failures and unsafe cases
- M20.2 must show line-spacing normalization closure
- M20.4 and M20.5 must prove safety and regression control

### 6. Paragraph spacing cleanup

What the category covers:
- safe cleanup of paragraph-before and paragraph-after spacing drift
- reduction of inconsistent spacing between adjacent paragraphs and list blocks
- preservation of intended grouping, list structure, and editability

Which corpus classes must exercise it:
- clean reference decks as no-regression evidence when spacing is already healthy
- mixed real-world decks
- hostile stress-test decks
- edge-case / unsafe-case decks as safety-boundary evidence

What counts as meaningful improvement:
- explicit paragraph-spacing drift is reduced on eligible decks
- intended separation and grouping are not collapsed by force
- cleanup improves consistency without breaking list or placeholder semantics

What does not count as proof:
- paragraph-spacing drift being named in the report
- one isolated paragraph-spacing demo
- visual tightening that breaks intended grouping
- any cleanup that hides unresolved spacing risk behind optimistic labels

What evidence is still required for closure:
- admitted mixed and hostile decks with paragraph-spacing-specific before/after proof
- clean-deck no-regression evidence
- boundary evidence on list-heavy, template-heavy, and other structurally risky decks
- repeated deterministic behavior that preserves structure

What current baseline status should be recorded honestly now:
- `Unproven`
- The roadmap explicitly indicates unresolved closure pressure on paragraph-level cleanup classes.

What future milestones must prove before the category can be treated as closed:
- M20.1 must classify spacing failures and unsafe cases
- M20.3 must show paragraph-spacing normalization closure
- M20.4 and M20.5 must prove safety and regression control

## Corpus class evaluation matrix

| Corpus class | Categories expected to be meaningfully evaluable there | Categories that may be observable but not closure-grade there | Acceptable outcomes for truthful MVP proof | Unacceptable outcomes for truthful MVP proof |
| --- | --- | --- | --- | --- |
| Clean reference decks | Font normalization, size normalization, and no-regression checks for any of the six categories that appear in the deck | Any category absent from the deck or present only trivially | Deck stays stable, editability is preserved, minor safe drift may be reduced, honest `ready` remains possible | Making a good deck worse, inventing drift, claiming closure because the deck was already clean |
| Hostile stress-test decks | All six categories must be meaningfully evaluable across the hostile class collectively, and at least one hostile deck must intentionally exercise all six at once | None should be treated as closure-grade if the deck is not formally admitted or if improvement is only cosmetic | Material reduction of safe in-scope drift, honest residual-risk reporting, `mostlyReady` can be acceptable | Claiming closure from detection only, forcing `ready`, hiding residual risk, using UI polish as proof |
| Mixed real-world decks | All six categories should be meaningfully evaluable across the class collectively on eligible naturally messy decks | A category may be observable but not closure-grade if the deck does not stress it enough or if the deck is ineligible for that category | Common in-scope drift improves safely, corrected PPTX remains editable, honest `ready` can be acceptable | Using only easy mixed decks to stand in for hostile proof, over-claiming readiness where reduction is weak |
| Edge-case / unsafe-case decks | All six categories may be meaningfully evaluable as safety-boundary evidence when exposed, but not as required successful-normalization targets | Any apparent improvement on unsafe decks is not closure-grade by itself | Honest `bad/manual review` remains acceptable, safe refusal is acceptable, limited safe partial cleanup may be acceptable if risk stays visible | Forcing normalization that breaks structure, counting unsafe decks as proof of category closure, hiding ineligible status |

## M18.3 boundary

This sprint records the baseline matrix only.

This document does not start M18.4 and does not define:

- report truth gate rules
- readiness label thresholds
- scoring thresholds
- report wording requirements
- engine diagnosis or cleanup implementation plans

If evidence and messaging disagree, evidence wins.
