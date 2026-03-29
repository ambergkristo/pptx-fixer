# CleanDeck - Milestones

## Active Authority

- The active milestone statute is [11_M26_MASTER_OUTPUT_TRUTH_RESET.md](./11_M26_MASTER_OUTPUT_TRUTH_RESET.md).
- Old roadmap items M18-M25 are treated as historically completed/reviewed and remain archive material only.
- Every future Codex task must start by reading `00_MASTERPLAN.md`, `01_MILESTONES.md`, `02_CODEX_WORKFLOW.md`, `11_M26_MASTER_OUTPUT_TRUTH_RESET.md`, and `10_NEXT_SESSION_PROMPT.md`.

## Active Milestone Framework

### M26 - Master Output Truth Recovery

Status: `ACTIVE`

Purpose:
Stop measuring success through helper-level, report-layer, or test-only wins and recover real observed product quality on the current master acceptance PPTX.

Program completion rule:
M26 is complete only when the master acceptance PPTX shows measurable before/after improvement, boundary honesty holds, and every M26.x sprint is honestly closed or failed with evidence.

## Active Sprint Status

| Sprint | Status | Problem statement | Required runtime target | Required truth source | Required boundary check | Completion condition | Evidence note |
|------|------|------|------|------|------|------|------|
| M26.1 - Stop Global Font Flattening | DONE | Font cleanup is collapsing hierarchy by over-normalizing across distinct text roles. | Font normalization runtime path that selects and applies font family / size fixes. | Current master acceptance PPTX plus directly relevant font-drift corpus files. | At least one negative/boundary case proving unsupported or intentionally distinct typography did not get flattened. | Real before/after output shows lower font drift without global hierarchy collapse. | DONE: locked canonical master acceptance path at `testdata/corpus/master/cleandeck-master-acceptance-v1.pptx`. Canonical validation via `npm run validate:master-acceptance` records master font drift `2 -> 1` with protected typography mutations `0 -> 0`, `mixed-font-drift` `2 -> 1`, `mixed-run-paragraph` `2 -> 1`, and `font-role-guard-boundary` staying `1 -> 1` with protected typography mutations `0 -> 0`. |
| M26.2 - Real Alignment Closure on Master Deck | PENDING | Alignment cleanup still leaves real alignment drift open on the master deck. | Alignment audit and enforcement runtime modules. | Current master acceptance PPTX plus directly relevant alignment corpus files. | At least one negative/boundary case proving unsupported alignment scenarios stay honest or untouched. | Real before/after output shows measurable alignment drift reduction on the master deck without new regressions. | TODO |
| M26.3 - Bullet / Indent Closure on Master Deck | PENDING | Bullet marker and indent cleanup are not yet closed on the master deck. | Bullet symbol, indent detection, and bullet enforcement runtime modules. | Current master acceptance PPTX plus directly relevant bullet/indent corpus files. | At least one negative/boundary case proving nested or unsupported list structures did not get worse. | Real before/after output shows measurable bullet / indent drift reduction on the master deck without list damage. | TODO |
| M26.4 - Line + Paragraph Spacing Closure on Master Deck | PENDING | Line spacing and paragraph spacing drift remain open on the master deck. | Paragraph spacing and line spacing runtime modules. | Current master acceptance PPTX plus directly relevant spacing corpus files. | At least one negative/boundary case proving spacing conflict or unsupported layout cases did not get worse. | Real before/after output shows measurable spacing drift reduction on the master deck without layout damage. | TODO |
| M26.5 - Boundary Honesty Recovery on Reject / Ambiguous / Unsupported Slides | PENDING | Boundary logic can drift when cleanup pressure increases. | Eligibility, rejection, ambiguity, and unsupported-case runtime decision path. | Current master acceptance PPTX where relevant plus directly relevant boundary corpus files. | At least one negative/boundary case is required because boundary honesty is the sprint target. | Real before/after output and logs show reject / ambiguous / unsupported classification stayed truthful or improved. | TODO |
| M26.6 - Master Deck Recovery Gate Review | PENDING | The repo needs a final gate that proves master-deck recovery without control-plane theater. | End-to-end runtime validation and truth-reporting path across the recovered modules. | Current master acceptance PPTX, all directly relevant corpus files used in M26.1-M26.5, and at least one negative/boundary case. | Boundary honesty must be rechecked across the combined run before this sprint can close. | A product improvement table proves measurable master-deck recovery and no worse boundary honesty. | TODO |

## Historical Note

M18-M25 remain available as historical control artifacts, but they are not the active execution framework.
