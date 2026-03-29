# Combined QA Test Deck v1

Purpose:
- one manual QA deck that combines safe-fix master-style slides, hostile mixed slides, and boundary-role guard slides in one file

File:
- `testdata/corpus/mixed-formatting/combined-qa-test-deck-v1.pptx`

Generation:
- `node scripts/generateCombinedQaTestDeck.ts`

Sections:
- slide 1: clean reference, should remain unchanged
- slide 2: typography drift with one family outlier, one size outlier, and one protected Georgia role
- slide 3: alignment drift with centered/right local drift plus one intentional centered role
- slide 4: bullet marker and indent drift with a numbered reference list that should stay numbered
- slide 5: paragraph-spacing and line-spacing drift
- slide 6: hostile mixed slide with typography, alignment, spacing, and bullet variance at once
- slide 7: centered hero boundary role
- slide 8: mixed intentional boundary roles with left body, centered quote, right KPI/attribution, and a Georgia role
- slide 9: QA checklist for manual review

Protected role expectations:
- slide 2: `Intentional Georgia callout must stay distinct.`
- slide 3: `Intentional centered role must stay centered.`
- slide 7: centered hero composition must stay centered
- slide 8: `Intentional Georgia callout must stay distinct.`
- slide 8: `Right-aligned KPI must stay right.`
- slide 8: `Right-aligned attribution must stay right.`
- slide 8: `Intentional centered quote must stay centered.`
