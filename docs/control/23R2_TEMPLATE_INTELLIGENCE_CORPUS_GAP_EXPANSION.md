# CleanDeck - Template Intelligence Corpus Gap Expansion

## Authority

- This document is subordinate to [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- It is aligned with the official acceptance corpus definition in [12_ACCEPTANCE_CORPUS.md](./12_ACCEPTANCE_CORPUS.md).
- It is aligned with the official category baseline matrix in [13_CATEGORY_BASELINE_MATRIX.md](./13_CATEGORY_BASELINE_MATRIX.md).
- It is aligned with the official report truth gate in [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md).
- It is aligned with the current hostile evidence artifact in [17_HOSTILE_RERUN_PROOF.md](./17_HOSTILE_RERUN_PROOF.md).
- It is aligned with the official eligibility boundary in [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It is aligned with the official controlled beta packaging in [19_CONTROLLED_BETA_PACKAGING.md](./19_CONTROLLED_BETA_PACKAGING.md).
- It is aligned with the official brand-drift taxonomy in [20_BRAND_DRIFT_TAXONOMY.md](./20_BRAND_DRIFT_TAXONOMY.md).
- It is aligned with the official brand-drift pilot package in [21_BRAND_DRIFT_PILOT.md](./21_BRAND_DRIFT_PILOT.md).
- It is aligned with the official deck style fingerprint specification in [22_DECK_STYLE_FINGERPRINT_SPEC.md](./22_DECK_STYLE_FINGERPRINT_SPEC.md).
- It is aligned with the official template intelligence gate review in [23_TEMPLATE_INTELLIGENCE_GATE_REVIEW.md](./23_TEMPLATE_INTELLIGENCE_GATE_REVIEW.md).
- It is aligned with the official fingerprint target eligibility matrix in [23R1_FINGERPRINT_TARGET_ELIGIBILITY_MATRIX.md](./23R1_FINGERPRINT_TARGET_ELIGIBILITY_MATRIX.md).
- It is grounded in the current admitted corpus inventory in [manifest.json](../../testdata/corpus/manifest.json).
- It defines the canonical M23.R2 corpus-gap expansion artifact for Phase 4 recovery only.
- It does not implement enforcement behavior, broaden the default cleanup pipeline, change the M23.5 verdict, or begin any M24.x work.

## Purpose

This recovery artifact defines the missing corpus and proof surfaces required to evaluate fingerprint-driven normalization beyond the current alignment-only evidence.

It is an evidence-plan document, not an implementation approval. It records what proof is still missing so later recovery work can stay disciplined.

## Current proof boundary

Current real proof for fingerprint-driven normalization is **alignment-only**.

Current proof does **not** yet show real-deck fingerprint-driven normalization readiness for:

- font family
- font size
- line spacing
- paragraph spacing
- bullet indent

The M23.5 gate verdict remains `notReady`.

Phase 5 remains blocked.

M24.1 may not begin.

## Why this recovery sprint exists

M23.5 froze the main Phase 4 problem:

- fingerprint extraction is still only partly full outside the strongest histogram surface
- confidence remains intentionally conservative
- the only applied experiment proof is alignment-only

M23.R1 then froze the current target boundary:

- `alignment` is the only current `experimentEligible` target
- non-alignment targets remain `candidateOnly`, `blocked`, or `excluded`

This sprint exists so later recovery work can expand proof coverage without confusing missing-proof diagnosis with readiness.

## Current admitted corpus context

Current admitted corpus inputs already relevant to this recovery include:

- [mixed-font-drift.pptx](../../testdata/corpus/mixed-formatting/mixed-font-drift.pptx)
- [mixed-run-paragraph.pptx](../../testdata/corpus/mixed-formatting/mixed-run-paragraph.pptx)
- [bullet-heavy-list.pptx](../../testdata/corpus/bullet-heavy/bullet-heavy-list.pptx)
- [bullet-nested-structure.pptx](../../testdata/corpus/bullet-heavy/bullet-nested-structure.pptx)
- [bullet-indent-jump-drift.pptx](../../testdata/corpus/bullet-heavy/bullet-indent-jump-drift.pptx)
- [template-placeholders.pptx](../../testdata/corpus/template-heavy/template-placeholders.pptx)
- [alignment-body-style-drift.pptx](../../testdata/corpus/alignment/alignment-body-style-drift.pptx)
- [line-spacing-combined-drift.pptx](../../testdata/corpus/spacing/line-spacing-combined-drift.pptx)
- [paragraph-spacing-combined-drift.pptx](../../testdata/corpus/spacing/paragraph-spacing-combined-drift.pptx)

These decks are useful boundary evidence, but they do not yet supply the non-alignment fingerprint-to-target proof needed for broader experimental claims.

## Non-alignment target classes to evaluate

### 1. Font family targetability

Current evidence available:

- current fingerprint surfaces can expose deck-level `fontFamily`
- `usageDistributionEvidence` is currently the strongest reliable fingerprint dimension
- current experiment planner can recognize a shared font-family candidate in principle
- Phase 1 already proved ordinary font-family normalization safety elsewhere in the engine

Current blocker type:

- missing real-deck fingerprint-driven experiment proof
- current fingerprint agreement is still too partial outside histogram evidence
- same-deck self-confirmation would be too weak for a broader claim

What corpus examples are missing:

- same-style decks with isolated font-family drift and otherwise matching style anchors
- paired real-deck or realistic-sanitized decks where histogram agreement and target font agreement exist without spacing/alignment ambiguity
- template-risk comparison decks where font-family similarity exists but other structure signals should still block experiment use

Suggested corpus naming style:

- `fingerprint/font-family-isolated-drift.pptx`
- `fingerprint/font-family-shared-target-safe.pptx`
- `fingerprint/font-family-template-risk-lookalike.pptx`

What passable real-deck proof would need to show:

- repeated extraction yields the same shared target deterministically
- target agreement is not only synthetic self-confirmation
- the experimental path changes only intended font-family drift
- no unintended mutation appears in spacing, alignment, bullets, or structure
- post-run audit shows reduced family drift with no broadened risk signal

Next step:

- `more corpus only`

### 2. Font size targetability

Current evidence available:

- current fingerprint surfaces can expose deck-level `fontSize`
- `usageDistributionEvidence` and deck snapshot can contribute candidate size agreement
- Phase 1 already proved ordinary font-size normalization safety elsewhere in the engine

Current blocker type:

- missing real-deck fingerprint-driven experiment proof
- partial fingerprint agreement is still insufficient to authorize size targeting
- current evidence does not show that shared size targets remain stable on non-trivial decks

What corpus examples are missing:

- same-style decks with isolated font-size drift and stable family/alignment context
- realistic decks with mixed size outliers inside otherwise uniform style families
- negative-control decks where histogram leaders match but structural context should still block confidence or targeting

Suggested corpus naming style:

- `fingerprint/font-size-isolated-drift.pptx`
- `fingerprint/font-size-shared-target-safe.pptx`
- `fingerprint/font-size-false-positive-guard.pptx`

What passable real-deck proof would need to show:

- deterministic shared size target extraction
- safe reduction of size drift without collateral alignment or spacing mutation
- negative controls remain non-eligible under the same rules
- proof is reproducible on more than one admitted deck shape

Next step:

- `more corpus only`

### 3. Line spacing targetability

Current evidence available:

- Phase 1 proved line-spacing cleanup safety and guardrails for ordinary normalization
- current fingerprint surfaces do include line-spacing fields, but they remain partial or null-capped
- M23.R1 froze line-spacing targetability as `blocked`

Current blocker type:

- blocked pending reliability improvement
- fingerprint-side spacing target extraction is not reliable enough
- confidence logic does not currently admit spacing as trusted or corroborating target evidence

What corpus examples are missing:

- same-style decks with isolated line-spacing drift and low structural risk
- decks where line-spacing drift exists but mixed spacing kinds should force safe non-eligibility
- template-heavy and inherited-spacing decks that prove null-safe degradation rather than false target creation

Suggested corpus naming style:

- `fingerprint/line-spacing-isolated-drift.pptx`
- `fingerprint/line-spacing-mixed-kind-blocked.pptx`
- `fingerprint/line-spacing-inherited-null-safe.pptx`

What passable real-deck proof would need to show:

- fingerprint-side spacing target extraction is deterministic and explainable
- mixed-kind or inherited ambiguity reliably blocks targeting
- eligible line-spacing experiment cases reduce only intended spacing drift
- structurally risky spacing decks stay blocked or no-op

Next step:

- `blocked pending reliability improvement`

### 4. Paragraph spacing targetability

Current evidence available:

- Phase 1 proved paragraph-spacing cleanup safety and conflict guardrails for ordinary normalization
- current fingerprint surfaces include spacing fields, but paragraph-spacing target evidence remains partial or null-capped
- M23.R1 froze paragraph-spacing targetability as `blocked`

Current blocker type:

- blocked pending reliability improvement
- current fingerprint extraction is too weak for paragraph-spacing target trust
- current confidence rules do not promote paragraph-spacing evidence into experimental authorization

What corpus examples are missing:

- same-style decks with isolated paragraph-spacing drift and stable non-spacing style anchors
- decks where paragraph-spacing drift coexists with conflicting line-spacing evidence and must stay blocked
- template-heavy decks where inherited/default spacing should degrade to null-safe target absence

Suggested corpus naming style:

- `fingerprint/paragraph-spacing-isolated-drift.pptx`
- `fingerprint/paragraph-spacing-conflict-blocked.pptx`
- `fingerprint/paragraph-spacing-inherited-null-safe.pptx`

What passable real-deck proof would need to show:

- deterministic extraction of a paragraph-spacing target without guessing inherited/default values
- safe blocking when conflict conditions exist
- reduction of intended paragraph-spacing drift only on truly eligible decks
- no false upgrade from partial spacing evidence to experiment eligibility

Next step:

- `blocked pending reliability improvement`

### 5. Bullet indent targetability

Current evidence available:

- Phase 1 already proved bullet-indent cleanup safety for ordinary normalization
- current fingerprint-side bullet evidence is indirect through paragraph-group signatures and `bulletLevel`
- paragraph-group signatures remain excluded from trusted template confidence
- M23.R1 froze bullet-indent targetability as `blocked`

Current blocker type:

- blocked pending reliability improvement
- current bullet target evidence is too indirect
- list-structure safety cannot be inferred from current fingerprint truth alone

What corpus examples are missing:

- same-style decks with isolated bullet-indent drift where list hierarchy remains clearly stable
- decks with repeated list structure where indentation differs but bullet symbol and level semantics should remain safe
- structurally risky bullet decks where nested or irregular hierarchy must block targetability

Suggested corpus naming style:

- `fingerprint/bullet-indent-isolated-drift.pptx`
- `fingerprint/bullet-indent-repeated-structure-safe.pptx`
- `fingerprint/bullet-indent-hierarchy-risk-blocked.pptx`

What passable real-deck proof would need to show:

- fingerprint-side list target extraction is deterministic enough to propose a target safely
- experiments preserve list structure and bullet semantics
- risky hierarchy cases remain blocked
- success is not limited to one synthetic jump pattern

Next step:

- `blocked pending reliability improvement`

## Corpus design additions

The next recovery corpus should add conservative deck categories that fill the current proof gaps without widening product claims.

### A. Isolated non-alignment drift decks

Purpose:

- prove whether a single non-alignment target can be derived and tested without cross-category confusion

Needed additions:

- font-family isolated drift decks
- font-size isolated drift decks
- line-spacing isolated drift decks
- paragraph-spacing isolated drift decks
- bullet-indent isolated drift decks

Why this class is needed:

- current proof is too entangled or too partial to attribute safe fingerprint-driven targeting beyond alignment

### B. False-positive guard decks

Purpose:

- prove that similar-looking decks do not create false fingerprint targetability

Needed additions:

- same histogram leader but different local style anchors
- same deck snapshot leader but conflicting body-style consensus
- list-heavy decks with similar bullet levels but unsafe hierarchy changes
- spacing decks with inherited/default ambiguity

Why this class is needed:

- positive proof without negative controls would overstate reliability

### C. Structure-risk degradation decks

Purpose:

- prove that non-alignment targets degrade to blocked or no-op when structure makes targeting unsafe

Needed additions:

- template-heavy placeholder decks with apparent font/size similarity
- mixed-kind line-spacing decks
- conflicting paragraph-spacing / line-spacing decks
- nested list hierarchy risk decks

Why this class is needed:

- template intelligence must fail safely before any broader experiment expansion can be justified

### D. Repeated-deck comparison sets

Purpose:

- prove that candidate targets are stable across more than one deck in the same style family

Needed additions:

- two-deck or three-deck sets with the same intended style family and one isolated non-alignment drift class
- sanitized real-deck families where one deck acts as comparison target and others act as candidate decks

Why this class is needed:

- same-deck self-confirmation is too weak for any broader targetability claim

## Proof rules by target class

### Font family

Acceptable proof:

- real or realistic-sanitized multi-deck comparison
- deterministic target extraction
- mutation limited to intended family drift
- no structural or cross-category collateral damage

Not acceptable:

- synthetic-only proof with no realistic counterpart
- same-deck self-confirmation alone
- report-only improvement without mutation safety evidence

### Font size

Acceptable proof:

- real or realistic-sanitized multi-deck comparison
- deterministic target extraction
- size-drift reduction without spacing or alignment collateral changes

Not acceptable:

- one synthetic isolated deck alone
- histogram agreement alone
- readiness or report consistency alone

### Line spacing

Acceptable proof:

- deterministic extraction of eligible targets
- explicit blocked behavior on mixed-kind and inherited-risk decks
- safe mutation proof on low-risk real-deck cases

Not acceptable:

- borrowing ordinary spacing-fix success as proof of fingerprint targetability
- report-level consistency alone
- partial fingerprint evidence treated as experiment eligibility

### Paragraph spacing

Acceptable proof:

- deterministic target extraction on eligible low-risk decks
- safe blocking on conflict or inherited ambiguity
- mutation proof that remains isolated to intended paragraph-spacing drift

Not acceptable:

- same-deck self-confirmation alone
- synthetic-only proof without realistic counterpart
- guardrail presence without actual target extraction proof

### Bullet indent

Acceptable proof:

- deterministic target extraction tied to stable list structure
- safe mutation that preserves hierarchy and bullet semantics
- explicit blocked behavior on hierarchy-risk decks

Not acceptable:

- ordinary bullet-fix success treated as fingerprint target proof
- paragraph-group partial evidence alone
- report-level drift reduction alone without structure-safety confirmation

## Cross-cutting proof rules

1. Synthetic-only proof is insufficient for broader claims.
2. Same-deck self-confirmation is insufficient for broad targetability claims.
3. Partial fingerprint evidence is insufficient to mark any non-alignment target `experimentEligible`.
4. Report-level consistency alone is insufficient if mutation safety is unproven.
5. A new corpus plan is not proof that the target is now eligible.
6. Negative controls are required wherever false-positive targetability is plausible.

## Recovery implications

This sprint does not change the M23.5 gate.

The official recovery position remains:

- M23.5 `notReady` remains unchanged
- Phase 5 remains blocked
- M24.1 may not begin
- only `alignment` remains currently `experimentEligible`

This sprint only prepares the evidence plan for later recovery work.

No non-alignment dimension becomes `experimentEligible` because this corpus plan now exists.

## Recommended next-step discipline

- `alignment`
  No new eligibility upgrade needed now. Use as the control baseline only.
- `font family`
  More corpus only.
- `font size`
  More corpus only.
- `line spacing`
  Blocked pending reliability improvement.
- `paragraph spacing`
  Blocked pending reliability improvement.
- `bullet indent`
  Blocked pending reliability improvement.

## What this sprint does not prove yet

This sprint does not prove:

- that any new non-alignment experiment should run now
- that any non-alignment target should be upgraded to `experimentEligible`
- that template matching is solved
- that template-targeted normalization is ready
- that Phase 5 may begin
- that M24.1 is approved

## M23.R2 boundary

This sprint defines the canonical corpus-gap expansion artifact only.

It does not:

- implement enforcement behavior
- widen default cleanup behavior
- add broad normalization logic
- productize M23.4 experiments
- change the M23.5 `notReady` verdict
- start M24.1
