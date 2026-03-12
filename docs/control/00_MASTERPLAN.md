# PPTX FIXER — Masterplan

## Product Thesis

PPTX Fixer on tööriist olemasolevate PowerPointi failide puhastamiseks.

See:

- auditeerib decki
- leiab formatting drift
- parandab ohutud vead
- säilitab sisu ja struktuuri

## Input

- üks `.pptx` fail

## Output

- parandatud `.pptx`
- fix report
- warnings

## MVP Scope

- pptx parsing
- deck lint report
- font normalization
- alignment cleanup
- spacing cleanup
- repeated object spacing normalization
- color consistency checks
- corrected pptx export

## Out of Scope

- slide generation
- narrative rewrite
- template conversion
- redesign
- chart restyling
- SmartArt transformations

## Product Principles

1. Reliability over novelty
2. Safe fixes only
3. Preserve structure
4. Warn instead of risky edit
5. No layout drift
6. Original file untouched
7. Deterministic engine
