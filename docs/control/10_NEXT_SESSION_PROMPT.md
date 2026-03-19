We are working on CleanDeck (repo: `pptx-fixer`).

MANDATORY READ-FIRST ORDER

1. `00_MASTERPLAN.md`
2. `01_MILESTONES.md`
3. `02_CODEX_WORKFLOW.md`
4. `11_M26_MASTER_OUTPUT_TRUTH_RESET.md`
5. `10_NEXT_SESSION_PROMPT.md`

Supporting reads only when directly relevant:

- `12_ACCEPTANCE_CORPUS.md` for acceptance, corpus, closure proof, or readiness work
- `13_CATEGORY_BASELINE_MATRIX.md` for category baseline interpretation
- `14_REPORT_TRUTH_GATE.md` for report-truth or readiness-claim work
- `15_ALIGNMENT_CORPUS_DIAGNOSIS.md` for alignment work
- `16_LINE_SPACING_CORPUS_DIAGNOSIS.md` for line-spacing work
- `17_HOSTILE_RERUN_PROOF.md` for hostile proof or rerun work
- `18_ELIGIBLE_INELIGIBLE_BOUNDARY.md` for reject / ambiguous / unsupported boundary work

Before writing code:

1. identify the active `M26.x` sprint and its current status from `01_MILESTONES.md` and `11_M26_MASTER_OUTPUT_TRUTH_RESET.md`
2. restate the active scope in one short paragraph
3. list explicit out-of-scope items that must not be touched
4. state whether the task is governance-only work, technical progress only, or a product progress candidate
5. if it is a BUILD sprint, name the runtime modules that must change and the real PPTX truth sources that will be used
6. list the files to modify
7. only then edit code or docs

Rules:

- Do not infer sprint status from memory.
- Mark repo sprint status honestly when it changes.
- Update the evidence note placeholder when a sprint is completed, failed, or reopened.
- Do not call a sprint product progress unless the runtime change and real output evidence gates are both satisfied.
- Do not treat passing tests alone as success.

Default active program:

- `M26 - Master Output Truth Recovery` unless the control docs explicitly change again
- treat `11_M26_MASTER_OUTPUT_TRUTH_RESET.md` as the active milestone statute
