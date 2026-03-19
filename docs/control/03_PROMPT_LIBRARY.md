# Prompt Library

## Required Read-First Sequence

Every future Codex sprint prompt must require this read order before implementation starts:

1. [00_MASTERPLAN.md](./00_MASTERPLAN.md)
2. [01_MILESTONES.md](./01_MILESTONES.md)
3. [02_CODEX_WORKFLOW.md](./02_CODEX_WORKFLOW.md)
4. [11_M26_MASTER_OUTPUT_TRUTH_RESET.md](./11_M26_MASTER_OUTPUT_TRUTH_RESET.md)
5. [10_NEXT_SESSION_PROMPT.md](./10_NEXT_SESSION_PROMPT.md)

Add other control documents only if the active sprint directly touches their subject.

## Mandatory BUILD Sprint Blocks

Every future BUILD sprint prompt must include all three blocks below verbatim. A BUILD sprint prompt is invalid without them.

```text
================================
TEMPLATE 1 — PRODUCT PROGRESS RULE
================================

PRODUCT PROGRESS RULE

A sprint is not considered product progress unless:
1. real runtime behavior changed
2. real PPTX before/after output improved measurably
3. reject / ambiguous / unsupported boundaries did not get worse

If these are not all true, the sprint may be technically useful, but it is not product progress.
```

```text
================================
TEMPLATE 2 — REAL BUILD / NO THEATER RULE
================================

THIS SPRINT MUST CHANGE REAL PRODUCT BEHAVIOR

At least one runtime module must be materially changed.

Tests, docs, review artifacts, and corpus-only work are not enough on their own.

PRIMARY ACCEPTANCE FILE
Use the current master acceptance PPTX as a required truth source.

BOUNDARY HONESTY CHECK
You must also prove that reject / ambiguous / unsupported cases did NOT get worse.

NO GLOBAL FLATTENING
If the output becomes more uniform by incorrectly flattening font, size, spacing, or other categories globally, that is a failure, not a success.
```

```text
================================
TEMPLATE 3 — MANDATORY PRODUCT IMPROVEMENT GATE
================================

MANDATORY PRODUCT IMPROVEMENT GATE

This sprint is NOT complete unless you prove whether the product got better on real PPTX files.

You must run real before/after validation on:
1. the current master acceptance PPTX
2. any directly relevant corpus files for this sprint
3. at least one negative/boundary case if the sprint could affect blocking logic

You must report the result as a PRODUCT IMPROVEMENT TABLE with exact before/after numbers.

Required table format:

| File | Scenario | Metric | Before | After | Better / Same / Worse |
|------|----------|--------|--------|-------|------------------------|

You must include metrics relevant to the sprint, such as:
- alignment drift count
- font family drift count
- font size drift count
- line spacing drift count
- paragraph spacing drift count
- bullet / indent drift count
- template match outcome
- enforcement outcome
- blocked / rejected / ambiguous correctness
- out-of-scope untouched confirmation

You must also include:

REAL OUTPUT JUDGMENT
- Did the product get better on real PPTX output? yes / no
- If yes, exactly how?
- If no, exactly why not?

FAIL CONDITION
If the real PPTX output is not measurably better, do NOT present the sprint as success.
Say explicitly:
- runtime work completed but product output did not improve enough
or
- no meaningful product improvement proven

MANDATORY ARTIFACTS
If possible, save:
- before report JSON
- after report JSON
- output PPTX
- a short markdown note summarizing what changed in the real output

NO THEATER RULE
Passing unit tests alone is not enough.
A sprint that passes tests but does not improve real PPTX output must be treated as incomplete from a product perspective.
```

## BUILD Sprint Prompt Requirements

Every future BUILD sprint prompt should also name:

- the active `M26.x` sprint
- the runtime module(s) that must change
- the current master acceptance PPTX truth source
- directly relevant corpus files
- at least one negative/boundary case when applicable
- the repo location where evidence artifacts or notes will be saved
- whether the sprint result should be reported as technical progress only or as a product progress candidate
