# Full Business + Architecture Audit

## 1. Executive Verdict

This repository contains a real PowerPoint audit and cleanup engine. It is not fake. It can parse PPTX files, detect several classes of text-formatting drift, apply bounded fixes, export valid PPTX output, and produce machine-readable reports. The CLI path and the thin web shell both exercise real runtime behavior.

It is also carrying a large amount of governance, review, summary, and taxonomy surface relative to what is actually exposed as a product. The core engine is materially more real than the surrounding narrative layers, but the template-enforcement and AI-post-processing stories are still much narrower in actual shipped product surface than the repo volume suggests.

The strongest honest conclusion is:

- the audit-first cleanup engine is real
- the narrow template enforcement core is real but library-level
- the AI post-processing layer is real only as a narrow controlled workflow claim, not as a broad product
- the project is commercially plausible as a narrow workflow utility, internal ops tool, or add-on
- the project is not yet a broad template governance platform, not a broad AI deck fixer, and not a mature enterprise SaaS

The codebase is currently stronger than pure doc theater, but weaker than its review/control surface can make it look at first glance.

## 2. Honest Current Product Truth

The honest current product is:

- a PPTX audit-first QA and safe partial normalization engine for text-heavy decks
- available through a CLI and a thin upload/fix/download web shell
- strongest on explicit text-run and paragraph-style drift
- bounded by conservative fix logic and deterministic validation

It is not, today:

- a broad template enforcement platform
- a broad AI deck post-processing layer
- a slide generator
- a redesign engine
- a content rewrite engine
- a mature enterprise platform with auth, tenancy, job orchestration, storage lifecycle, or deployment hardening

The current AI claim must stay narrow:

- after generation
- only on admitted external-template matches
- only for `alignment` and `fontFamily`
- only when unsupported failure modes are absent

Anything broader is over-claim.

## 3. What Is Actually Built

The real runtime center is in TypeScript:

- `packages/audit/pptxAudit.ts` loads PPTX files, parses slide XML, extracts text formatting signals, computes drift counts, and builds deck/slide summaries.
- `packages/fix/runAllFixes.ts` orchestrates the standard cleanup pipeline across font family, font size, spacing, bullet indentation, alignment, line spacing, and dominant-style helpers.
- `packages/fix/runFixesByMode.ts` exposes the supported user-facing modes: `standard` and `minimal`.
- `packages/export/validateFixedPptx.ts` and `packages/export/outputPackageValidation.ts` validate that exported output is still a readable PPTX package.
- `apps/pptx-fixer-cli/runPptxFixer.ts` is a real CLI entrypoint.
- `apps/product-shell/server.ts` with `/audit`, `/fix`, and `/download` is a real, thin web shell over the same engine.

There is also a real narrow template-enforcement runtime:

- `packages/fix/runTemplateEnforcementCore.ts`
- `packages/audit/templateMatchOperatingEnvelope.ts`
- `packages/audit/templateEnforcementScope.ts`

This is real code, not doc fiction. But it is not exposed as a primary product surface. It is currently library-level capability plus tests.

There is also a real AI post-processing scope and reporting layer:

- `packages/audit/aiPostProcessingScope.ts`
- `packages/audit/aiDeckFailureModeSummary.ts`
- `packages/audit/aiPostProcessingReportSummary.ts`

This is mostly classification and reporting logic around the current narrow enforcement envelope. It is not a full user-facing AI workflow product. It is also not integrated into the web shell or the CLI as a first-class command.

There is a stale parallel Python path:

- `pptx_fixer/`
- `tests/test_audit.py`

It still works as a tiny audit utility, but it represents an older, much smaller product shape than the current TypeScript engine. Its presence weakens repo clarity.

## 4. Repo and Architecture Audit

### Architectural center of gravity

The real center of gravity is:

- `packages/audit/pptxAudit.ts`
- `packages/fix/runAllFixes.ts`
- the XML safety/text fidelity guards in `packages/fix/textFidelity.ts`

That is the real product core. Most higher-level behavior hangs off those modules.

### Real execution flows

The main execution flows are:

1. CLI audit:
   `apps/pptx-fixer-cli/runPptxFixer.ts` -> `loadPresentation` -> `analyzeSlides`
2. CLI fix:
   `runPptxFixer.ts` -> `runFixesByMode.ts` -> `runAllFixes.ts` or minimal mode -> export validation -> report JSON
3. Web shell:
   upload route -> same engine -> JSON response + download path
4. Template enforcement:
   library-only path through `runTemplateEnforcementCore.ts`
5. AI post-processing:
   library-only scope/failure/report helpers, not a shipped entrypoint

### Module boundary quality

What is good:

- fix operations are split into focused modules
- audit extraction and fix execution are separated
- CLI and web shell reuse the same engine
- enforcement scope, matching, and reporting are at least explicitly separated
- safety checks are encoded in runtime, not only in docs

What is weak:

- `packages/fix` has become crowded with summary and reporting modules that are not the core engine
- the repo mixes engine code, review/control artifacts, UI shell, CLI utilities, and stale Python code without a clean top-level product boundary
- there is no single clean application-service layer between engine internals and delivery surfaces
- template enforcement and AI post-processing remain more “capability packages” than packaged product flows

### Production-shape vs research-shape

The engine itself is partly production-shaped.

The repo as a whole is still research-shaped.

Why:

- many small summary modules exist because the repo has spent significant effort on report semantics and governance framing
- many control docs exist because the roadmap process is very review-heavy
- template/AI layers have more scope/report/taxonomy surface than user-facing integration

This is not pure theater, but it is not lean product packaging either.

### Naming consistency

Naming is mixed:

- `pptx-fixer` root launcher
- `apps/pptx-fixer-cli`
- `apps/fix-cli`
- `apps/audit-cli`
- `pptx_fixer` Python package

This is survivable, but it is not clean. It reads like several historical product shapes accumulating in one repo.

### Coupling and duplication

There is meaningful coupling through shared report structures and audit summaries. That is manageable now, but it will get worse if more product modes are added without consolidation.

There is also duplication in three forms:

- multiple delivery surfaces around the same engine
- many tests building synthetic PPTX fixtures inline
- legacy Python audit path duplicating product identity at a smaller capability level

### Scalability without major refactor

The current codebase can support more hardening inside the current narrow envelope.

It is not well-positioned to scale to a broader template platform or broad AI cleanup product without a major boundary cleanup. The summary/report/control surface would grow faster than the core if the current pattern continues.

## 5. Runtime Logic Audit

### Parser and ingest reliability

The parser is credible for the current text-centric scope:

- slide loading
- shape text bodies
- text runs
- paragraph properties
- histograms and drift signals

It is not credible to claim broad PPTX coverage.

No meaningful runtime evidence shows broad support for:

- tables
- charts
- graphic frames
- SmartArt
- heavy media/embedded objects
- advanced layout/master interactions

Searches across `packages/audit` and `packages/fix` did not show real handling for `graphicFrame`, tables, or charts. The likely truth is that those areas are ignored or unknown. For enterprise decks, that matters.

### Audit detection logic

The audit logic is strongest at:

- font family drift
- font size drift
- paragraph spacing drift
- bullet indentation/marker drift
- line spacing drift
- alignment drift
- slide/deck summaries on top of those

This is not generic design QA. It is text-formatting QA with structured summaries.

### Safe autofix logic

The autofix logic is better than average for an early-stage file mutator because it includes:

- XML structure safety checks
- text fidelity checks
- output package validation
- re-analysis after mutation

That is real safety engineering.

The weakness is not recklessness. The weakness is boundedness. The fixes are safe mainly because they are narrow and heavily constrained.

### Alignment normalization design

There are two alignment paths:

- local alignment normalization
- dominant-body-style based normalization

The design is conservative and intentionally incomplete. It looks for safe structure patterns and skips when mapping confidence is weak.

That is a strength for safety.

It is also a weakness for breadth. On messy real decks, it will skip often unless the structure happens to match its current heuristics.

### Spacing normalization design

Spacing logic is explicit and careful, but still heuristic:

- it compares paragraph spacing signatures
- checks line-spacing kind conflicts
- applies only when dominant signatures are safely inferable

This is respectable narrow engineering, not broad paragraph-layout intelligence.

### Bullet handling design

Bullet normalization also uses safe local heuristics:

- outlier detection
- jump flattening
- dominant marker inference

This is deterministic and explainable.

It is also highly special-cased. It is the kind of code that works well on the known family of patterns and becomes fragile when list structures get more exotic.

### Export reliability shape

Export validation covers:

- file existence
- non-empty output
- zip readability
- required core PPTX parts
- reloadability
- slide count parity

That is enough to catch broken package output.

It is not enough to claim visual fidelity or Office rendering correctness. The engine validates package integrity, not presentation semantics in PowerPoint itself.

### Brand drift and compliance layer

The “brand/compliance” layer is mostly reporting translation, not an actual policy engine.

Examples:

- `brandScoreImprovementSummary`
- `complianceOrientedReportSummary`
- `categoryReductionReportingSummary`

These translate local runtime evidence into governance-friendly language. They do not constitute full brand governance capability. This is one of the places where the repo can look more mature than the actual enforcement surface.

### Fingerprint extraction and template matching

The template intelligence layer is intentionally conservative:

- trusted positive evidence is limited
- confidence caps remain explicit
- null-capped dimensions and excluded dimensions are named directly

This is good truth discipline.

It is still narrow and corpus-bound. It is not general template intelligence.

### Template enforcement logic

`runTemplateEnforcementCore.ts` is real and better designed than the surrounding positioning story might lead a skeptic to expect.

Strengths:

- explicit admission preconditions
- only `alignment` and `fontFamily`
- post-stage verification
- out-of-scope drift must not change
- blocked/noop outcomes are explicit

Weaknesses:

- not wired into the product shell or CLI as a mainstream flow
- still dependent on synthetic external anchor families
- still weak in terms of commercial breadth

### AI post-processing logic

The AI layer is mostly:

- scope control
- failure classification
- reporting contract

It piggybacks on template enforcement rather than standing as an independent runtime layer.

That is honest and correct for now.

It also means the current AI layer is mostly a narrow interpretation/reporting layer, not a broad operational product.

### Determinism, explainability, and boundedness

Within the current envelope, determinism and boundedness are strong.

Outside it, the honest answer is unknown or blocked.

That is the right design posture. The project’s biggest runtime strength is not breadth. It is disciplined refusal to pretend breadth exists when it does not.

## 6. Testing vs Real Capability Audit

### What is test-backed real capability

These are test-backed and real:

- PPTX load and audit for text-heavy decks
- standard and minimal cleanup pipeline
- CLI audit and fix workflow
- basic web shell upload/fix/download workflow
- export package validation
- narrow external-template enforcement core
- narrow AI scope/failure/report helpers

### What is test-backed narrow capability

These are real but narrow:

- external-template matching
- template enforcement for `alignment` and `fontFamily`
- AI post-processing scope classification
- AI post-processing reporting

These are not fake. They are just much narrower than broad product language would imply.

### What is test-backed but commercially weak

Commercially weak despite passing tests:

- extensive review/control documentation
- many report translation layers
- governance-style summaries that translate runtime facts into more enterprise-friendly language
- AI failure taxonomy and report helpers without first-class product integration

These may be useful internally, but they are not the same thing as shipped market value.

### Docs-only or mostly docs-driven areas

The repo is unusually heavy on control artifacts for M23-M25. The docs are generally honest, but there is still a review/control surface that exceeds the current user-facing product surface.

This is not pure fiction. It is closer to:

- real engine
- real narrow enforcement
- real narrow AI workflow proof
- too much governance machinery wrapped around still-narrow delivery surfaces

### Corpus quality

The corpus is meaningful for text-style drift and safety validation.

The corpus is also heavily synthetic in the areas that matter most for future positioning:

- fingerprint/template families are mostly synthetic
- `ai-generated` decks are synthetic by explicit manifest labeling
- many tests generate tiny PPTX fixtures inline

This means the corpus is strong for deterministic local regression control, but weak as market proof.

### Test architecture quality

The test architecture is broad and serious. It covers:

- engine logic
- CLI
- web shell
- enforcement
- AI report/scope layers

That is a real strength.

But there are two important problems:

1. The repo currently shows runtime/test drift.

I ran a targeted runtime-heavy suite:

- `tests/pptxAudit.test.ts`
- `tests/runAllFixes.test.ts`
- `tests/runTemplateEnforcementCore.test.ts`
- `tests/templateEnforcementHighlyInconsistentDecks.test.ts`
- `tests/aiPostProcessingScope.test.ts`
- `tests/aiDeckFailureModeSummary.test.ts`
- `tests/aiPostProcessingReportSummary.test.ts`
- `tests/runPptxFixer.test.ts`
- `tests/productShell.test.ts`

Result:

- 65 passed
- 1 failed

The failing test was `tests/productShell.test.ts`, where report coverage expectations no longer matched runtime output. That is not catastrophic, but it is proof that “heavily tested” does not mean “currently fully aligned.”

2. The tests can create false comfort.

Why:

- many fixtures are synthetic
- many helper/report modules are tested because they are easy to isolate
- the repo has many more proof layers than real exposed product modes

### Bottom line on testing

Passing means:

- local technical behavior is often deterministic and bounded

Passing does not mean:

- broad real-world deck coverage
- commercial readiness
- enterprise readiness
- broad AI post-processing readiness

## 7. Product and Workflow Audit

### Actual user workflow today

The actual product workflow today is:

1. provide PPTX
2. run audit
3. optionally run cleanup
4. download fixed PPTX
5. download JSON report

That workflow is coherent.

### What kind of product this really is

Today it is closest to:

- engine first
- CLI utility second
- thin internal or beta web shell third

It is not yet a polished SaaS application.

### Is “upload -> audit -> fix -> export -> report” sellable?

Yes, narrowly.

It is sellable for teams that already feel pain from repetitive text-formatting cleanup in known deck families.

It is not yet sellable as a broad “we fix PowerPoints” claim.

### Template enforcement as product extension

Meaningful as a narrow enterprise/governance extension:

- yes, in principle
- no, not yet as a broad platform claim

Current limitation:

- it exists as code and tests
- it is not yet a mainstream exposed product workflow

### AI post-processing as product extension

Meaningful only as a narrow add-on claim.

The AI layer has a real controlled workflow story now, but it is still:

- synthetic-corpus heavy
- narrow in scope
- not generator intelligence
- not broad post-generation cleanup
- not layout redesign
- not content repair

### What the current real product is today

The real product today is:

- a deterministic PowerPoint cleanup utility for text-style drift
- with a strong audit story
- with safe bounded normalization
- and a thin shell around it

### What it is not today

It is not:

- a “presentation intelligence platform”
- a full template governance suite
- an AI-generated deck rescue layer
- a design QA system for all slide structures

### Likely buyer misunderstanding

If sold too aggressively, buyers will assume:

- it handles layout redesign
- it handles charts/tables/placeholders broadly
- it can clean any ugly AI-generated deck
- it can enforce brand templates broadly

Those assumptions would be false.

## 8. Business Audit

### Real problem severity

The underlying problem is real:

- formatting drift in decks is common
- manual cleanup is annoying and expensive
- design ops and enablement teams often do repetitive cleanup work

This is a real problem, but it is not always strategic-budget level pain.

### Likely ICPs

Strongest ICPs:

- presentation design ops teams
- enablement or marketing ops teams that repeatedly clean decks before distribution
- agencies or service teams standardizing client decks
- internal knowledge workers operating inside a known template family

Weakest ICPs:

- small teams wanting magic redesign
- general-purpose SMB buyers
- buyers expecting broad AI deck improvement
- buyers needing a full enterprise governance platform on day one

### Strongest buyer persona

Strongest buyer:

- the person who already spends hours each week cleaning formatting drift across recurring decks and wants deterministic help without content changes

### Weakest buyer persona

Weakest buyer:

- the person asking for “make my slides look good” in a broad, creative, layout-redesign sense

### Wedge use case

Best wedge:

- audit and partial cleanup for text-heavy decks before client or executive delivery

Secondary wedge:

- post-generation cleanup for controlled AI-generated decks that still match a known template anchor

### Time-to-value

Potentially good:

- drop file
- get drift summary
- apply safe cleanup

That is fast.

The problem is not time-to-value. The problem is scope expectations and trust.

### Switching friction

Switching friction is moderate:

- users must trust file mutation
- teams may have security concerns about uploads
- the current shell has no enterprise posture
- some users will default to manual PowerPoint cleanup instead

### Competitive alternatives

Real alternatives are:

- manual cleanup in PowerPoint
- internal design ops
- agencies
- template governance tools
- add-ins/macros
- generic presentation tooling
- AI presentation products that regenerate rather than normalize

### Differentiation

The credible differentiation is:

- deterministic, explainable, bounded cleanup
- audit-first posture
- safer than “AI magic” claims

That is real differentiation.

It is not a strong moat.

### Defensibility and moat

Current moat potential is low to moderate.

Why low:

- heuristics are reproducible
- corpus is mostly synthetic
- no network effects
- no proprietary customer proof in repo

Why not zero:

- the safety posture is disciplined
- the narrow template/enforcement envelope is more rigorously bounded than many quick-and-dirty competitors would build

### Pricing power

Pricing power is limited today.

Stronger pricing path:

- service-supported workflow tool
- add-on for design ops
- internal enterprise utility

Weaker pricing path:

- standalone mass-market SaaS

### Likely packaging options

Most plausible near-term packaging:

- internal ops tool
- agency/service support tool
- narrow add-on utility

Least plausible near-term packaging:

- broad standalone AI presentation product

### Likely go-to-market motion

Best GTM motion:

- founder-led sales to design ops or enablement teams
- narrow pilot on known deck families
- prove reduced cleanup time on real customer decks

Not recommended yet:

- broad self-serve AI positioning
- broad template-governance platform pitch

### Likely buyer objections

Likely objections:

- “Will it break my deck?”
- “Does it handle charts, tables, complex layouts?”
- “Does it work on our real decks or only your test corpus?”
- “Why not use our designers or existing add-ins?”
- “Where are the real customer examples?”
- “Where are the security and deployment controls?”

### Trust blockers

Major trust blockers today:

- synthetic-heavy advanced corpus
- no real-customer evidence in repo
- no enterprise product posture
- AI/template features not first-class in the shipped shell

### Is the narrow current product monetizable now?

Yes, but narrowly.

It is monetizable now as:

- a service-supported tool
- an internal ops utility
- a careful add-on

It is weak as a broad standalone product claim right now.

## 9. Brutal Risks and Weak Points

1. The repo risks drifting into test-and-doc theater around template and AI positioning.

The runtime core is real, but there is too much surrounding governance/report/control surface relative to exposed workflow value.

2. The product shell is thinner than the repo narrative.

The web shell exposes audit and cleanup. It does not expose the more advanced template/AI layers as first-class product flows.

3. The advanced proof corpus is too synthetic.

This is the single biggest commercial truth problem after basic runtime maturity.

4. There is stale product identity in the repo.

The old Python package and tests still exist. That makes the repo look like several generations of product thinking layered together.

5. Coverage for important enterprise slide content is unknown or likely weak.

Tables, charts, graphic frames, SmartArt, and more complex structures are not credibly covered by the current runtime evidence.

6. The current package/deployment story is weak.

There is no mature deployment, auth, tenancy, storage lifecycle, job queue, or compliance posture. The current shell is beta tooling, not enterprise application infrastructure.

7. Report-layer sprawl is real.

The repo has many summary modules that add explanation, but also complexity. If this continues, the cost of maintaining narrative consistency may outgrow the engine itself.

8. The test surface is broad, but not perfectly reliable.

The targeted runtime-heavy test run exposed at least one real drift failure in `tests/productShell.test.ts`.

## 10. Real Strengths and Leverage Points

1. The audit engine is real and useful.

This is the strongest fact in the repo.

2. Safety is not just aspirational.

XML safety checks, text fidelity checks, re-analysis, and package validation are meaningful runtime guardrails.

3. The team has shown unusual discipline in narrowing claims.

The roadmap and control docs are conservative. That matters because it reduces the chance of accidental product self-deception.

4. The narrow enforcement core is better than expected.

It is small, bounded, explainable, and guarded. That is the correct shape for an early enforcement engine.

5. The project has a plausible wedge.

Deterministic cleanup of recurring deck drift is a narrower and more credible wedge than “AI for presentations.”

## 11. Scores

- Product clarity: 6.6
  The docs are mostly honest, but the repo contains too many overlapping product shapes and legacy paths.
- Product truthfulness: 8.7
  The project usually states its bounds clearly and resists broad unsupported claims.
- Technical architecture quality: 6.9
  The engine core is sound, but the repo has summary sprawl, mixed delivery shapes, and stale parallel code.
- Determinism / safety quality: 8.1
  Strong inside the narrow envelope because safety is encoded in runtime checks, not only in narrative.
- Test quality: 7.1
  Broad and serious, but too synthetic in strategic areas and not fully drift-free right now.
- Runtime maturity: 5.9
  Real engine, real CLI, real web shell, but still limited in breadth and product hardening.
- Maintainability: 5.8
  Manageable today, but heading toward complexity drag if summary/control layers keep expanding.
- Commercial potential: 6.4
  There is real pain and a plausible wedge, but the product is still narrow and trust-constrained.
- Near-term monetizability: 5.6
  Sellable as a narrow utility or service-supported tool, weak as a broad standalone product.
- Positioning quality: 7.4
  Current truthful positioning is mostly good, especially when it stays narrow.
- Competitive defensibility: 3.9
  The moat is weak; the main advantage is disciplined execution and safety, not structural defensibility.
- Overall project health: 6.3
  Better than a paper tiger, worse than a ready product company. Real core, narrow value, messy scaling path.

Current overall verdict:

- real engine
- narrow credible product utility
- too much summary/governance surface around still-limited commercial scope

Next 3 biggest risks:

- synthetic evidence being mistaken for market readiness
- report/control complexity outrunning product value
- stale and fragmented product surfaces confusing users and future development

Next 3 biggest strengths:

- deterministic audit/fix core
- strong safety posture for a file-mutating product
- unusually honest boundary discipline

## 12. Immediate Recommendations

1. Remove or explicitly archive the stale Python product path.

Do not keep two product identities in one repo unless both are intentional and supported.

2. Choose one primary shipped surface and make it real.

Either:

- double down on CLI/API utility positioning

or:

- harden the web shell into the actual product

Right now it is split.

3. Stop investing in new positioning layers until real-deck evidence improves.

The next leverage move is not another taxonomy. It is more real customer or design-partner decks inside the current narrow envelope.

4. Fix shipped-surface regression drift first.

The failing `productShell` test is small, but it is symbolic. Release confidence must anchor on shipped workflows, not just control artifacts.

5. Turn template/AI capability into one explicit supported flow or stop talking about it as if it already is one.

Today those layers are real but mostly library/test/report surfaces.

## 13. Medium-Term Recommendations

1. Re-bound the architecture around one application service layer.

Create a thinner public runtime boundary that delivery surfaces call into, instead of letting summary objects sprawl across everything.

2. Replace synthetic-heavy strategic corpus growth with real-deck evidence.

Not “more tests” in the abstract.
Real decks first. Then tests that protect the resulting runtime behavior.

3. Decide whether the product is:

- a deterministic cleanup utility
- a design-ops internal tool
- or an add-on to other presentation workflows

Do not keep half-building all three.

4. Either integrate narrow template/AI flows into the real product shell, or demote them to internal/experimental modules.

5. Explicitly define unsupported PPTX structures in product-facing truth.

Tables, charts, layout redesign, narrative rewrite, structure repair, and unsupported classes should be impossible to misunderstand.

## 14. Final Positioning Recommendation

The best current positioning is:

- CleanDeck is a deterministic audit-first PPTX cleanup utility for text-heavy decks with safe partial normalization.

The best narrow extension claim is:

- it can also operate as a constrained post-processing add-on after deck generation when a generated deck still matches a known admitted template family and only `alignment` and `fontFamily` fall inside the proven cleanup envelope.

Do not position it right now as:

- a broad template governance platform
- a broad AI deck cleanup product
- a redesign engine
- a generator

The current AI layer is best described as:

- a real but narrow supporting add-on position

not:

- the main product

If forced into one brutal sentence:

This is a real cleanup engine with a plausible narrow commercial wedge, but the repo currently over-indexes on proving and narrating edge positioning layers before packaging the core into a sharper, simpler, more obviously sellable product.
