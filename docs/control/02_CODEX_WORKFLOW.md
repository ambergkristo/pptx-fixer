# Codex Workflow

## Mandatory Start Sequence

Every future Codex task must begin by reading these files in order:

1. [00_MASTERPLAN.md](./00_MASTERPLAN.md)
2. [01_MILESTONES.md](./01_MILESTONES.md)
3. [02_CODEX_WORKFLOW.md](./02_CODEX_WORKFLOW.md)
4. [11_M26_MASTER_OUTPUT_TRUTH_RESET.md](./11_M26_MASTER_OUTPUT_TRUTH_RESET.md)
5. [10_NEXT_SESSION_PROMPT.md](./10_NEXT_SESSION_PROMPT.md)

Read other control documents only when the active sprint or current task makes them directly relevant.

## Single-Sprint Discipline

1. Work one sprint at a time.
2. Identify the active `M26.x` sprint and its current repo-visible status before editing code.
3. Restate the active scope and explicit out-of-scope items before implementation.
4. Change only the runtime modules required by that sprint.
5. Validate against the current master acceptance PPTX, directly relevant corpus files, and at least one negative/boundary case when the sprint can affect boundaries.
6. Update repo-visible sprint status and evidence notes if the sprint state changes.

## Technical Progress vs Product Progress

Technical progress:

- governance updates
- docs
- review artifacts
- test-only work
- helper-level work
- report-layer work
- runtime refactors that do not prove better real PPTX output

Technical progress can be useful, but it is not product progress by default.

Product progress:

A BUILD sprint counts as product progress only when all three are true:

1. real runtime behavior changed
2. real PPTX before/after output improved measurably
3. reject / ambiguous / unsupported boundaries did not get worse

If any one of those is missing, treat the sprint as technical progress only.

## Non-Negotiable Rules

- No two document-only or review-only sprints in a row.
- Passing tests alone is not success.
- Helper-level success is not enough.
- Report-layer success is not enough.
- Synthetic proof must never be presented as market proof.
- Evidence wins over messaging.
- Current proof wins over future strategy.

## BUILD Sprint Gate

- Every future BUILD sprint prompt must include the three mandatory governance blocks stored in [03_PROMPT_LIBRARY.md](./03_PROMPT_LIBRARY.md).
- A BUILD sprint is incomplete until it produces explicit before/after evidence on real PPTX files.
- If real PPTX output is not measurably better, say so explicitly and do not present the sprint as product success.
