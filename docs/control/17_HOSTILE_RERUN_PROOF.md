# CleanDeck - Hostile Re-Run Proof

## Authority

- This document is subordinate to [11_M26_MASTER_OUTPUT_TRUTH_RESET.md](./11_M26_MASTER_OUTPUT_TRUTH_RESET.md).
- It is aligned with [14_REPORT_TRUTH_GATE.md](./14_REPORT_TRUTH_GATE.md) and [18_ELIGIBLE_INELIGIBLE_BOUNDARY.md](./18_ELIGIBLE_INELIGIBLE_BOUNDARY.md).
- It records the current admitted hostile proof surface used by the recovery gate.

## Current hostile truth

An officially admitted hostile stress deck now exists in the corpus manifest:

- [testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx](../../testdata/corpus/hostile/cleandeck-chaos-gate-v1.pptx)

It is generated deterministically by:

- [scripts/generateChaosDeck.ts](../../scripts/generateChaosDeck.ts)

The repeatable repo-visible hostile proof command is now:

- `npm run validate:recovery-gate`

Artifacts are written to:

- `.tmp/recovery_gate_validation/`

## What the hostile deck proves now

The admitted hostile deck intentionally stresses mixed-category cleanup while staying inside the current safe cleanup envelope for value metrics.

Current measured hostile result from `npm run validate:recovery-gate`:

| Metric | Before | After | Verdict |
| --- | --- | --- | --- |
| alignment drift count | 4 | 0 | closed on this deck |
| bullet indent drift count | 4 | 0 | closed on this deck |
| line spacing value drift count | 4 | 0 | closed on this deck |
| paragraph spacing value drift count | 6 | 0 | closed on this deck |
| line spacing diagnostic count | 0 | 0 | stable |
| paragraph spacing diagnostic count | 0 | 0 | stable |

Activity counters are still recorded by the recovery gate, but they are not treated as value wins:

- changed text runs
- changed paragraphs
- count of slides touched

The hostile deck now also stays second-pass stable:

- first pass applies the expected hostile cleanup
- second pass is a true no-op

This second-pass stability matters because hostile mixed-slide cleanup used to expose latent typography work only after spacing regrouping. That instability is now closed in the main runtime through [packages/fix/runAllFixes.ts](../../packages/fix/runAllFixes.ts).

## Boundary honesty result

Hostile proof is not accepted alone. The recovery gate also re-runs the current boundary decks:

- [testdata/corpus/alignment/alignment-role-guard-boundary.pptx](../../testdata/corpus/alignment/alignment-role-guard-boundary.pptx)
- [testdata/corpus/mixed-formatting/font-role-guard-boundary.pptx](../../testdata/corpus/mixed-formatting/font-role-guard-boundary.pptx)
- [testdata/corpus/boundary/mixed-hard-boundary-v1.pptx](../../testdata/corpus/boundary/mixed-hard-boundary-v1.pptx)

Current boundary result:

- boundary mutations `0 -> 0`
- protected centered/right roles preserved `2 / 2`
- protected typography roles preserved `2 / 2`
- mixed hard boundary remains untouched while diagnostic spacing/list structure stays visible

## Why this document changed

Older hostile notes were based on an untracked generated deck and partial hostile improvement.

That is no longer the active truth.

The current hostile truth is:

- hostile proof is admitted in the manifest
- hostile proof is repeatable with one command
- hostile value metrics now close on the admitted hostile deck
- boundary honesty is checked in the same loop

## What this still does not mean

This does not widen CleanDeck into a broad cleanup platform.

It means only that the current deterministic cleanup classes now have:

- a canonical master truth source
- an admitted hostile stress deck
- boundary decks
- a repeatable recovery gate

and that the current recovery gate is now truthful and reproducible.
