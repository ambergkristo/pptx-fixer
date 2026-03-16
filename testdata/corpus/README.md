# Regression Corpus

This corpus supports M6 engine robustness work for CleanDeck.

Rules:

- Do not commit confidential decks.
- Prefer sanitized or synthetic decks that reproduce a specific PPTX risk.
- Keep the core corpus deterministic and small enough for normal test runs.
- Keep larger or noisier decks in the extended corpus tier for optional robustness runs.

## Structure

- `simple/`
- `mixed-formatting/`
- `bullet-heavy/`
- `template-heavy/`
- `field-node/`
- `large-decks/`

## Tiers

- `core`: included in normal automated test runs
- `extended`: available for optional manual robustness runs with `PPTX_FIXER_EXTENDED_CORPUS=1`

## Coverage Expectations

Each usable corpus deck should exercise:

- audit load
- cleanup
- export validation
- text fidelity verification

See [manifest.json](/C:/Users/Kasutaja/pptx-fixer/testdata/corpus/manifest.json) for per-deck metadata and risk notes.
