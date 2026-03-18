# Acceptance Corpus Assets

## Control Reset Note

- The official active roadmap statute is [11_TRUTH_RESET_ROADMAP.md](../../11_TRUTH_RESET_ROADMAP.md).
- The official acceptance corpus definition is [12_ACCEPTANCE_CORPUS.md](../../docs/control/12_ACCEPTANCE_CORPUS.md).
- This folder is the tracked corpus asset inventory and execution surface.
- This folder does not define product truth, milestone claims, or corpus-class authority by itself.
- Storage folders and execution tiers are not the same thing as acceptance classes.

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

These tiers are runtime execution tiers only. They do not determine whether a deck is:

- clean reference
- hostile stress-test
- mixed real-world
- edge-case / unsafe-case

## Commands

- `npm test`: runs the normal suite and only the `core` corpus tier
- `npm run corpus:test`: runs the dedicated corpus suite with both `core` and `extended` tiers

## Manifest Metadata

The current manifest inventory records:

- `id`
- `tier`
- `category`
- `producer`
- `slideCount`
- `file`
- `description`
- `risk`

The manifest remains an inventory file. Acceptance-governance fields such as corpus class, eligibility status, expected outcome, targeted cleanup categories, and admission reason are defined by [12_ACCEPTANCE_CORPUS.md](../../docs/control/12_ACCEPTANCE_CORPUS.md).

## Coverage Expectations

Each usable corpus deck should exercise:

- audit load
- cleanup
- export validation
- text fidelity verification

For truthful MVP proof, corpus coverage must also be evaluated against the six official cleanup categories defined in [12_ACCEPTANCE_CORPUS.md](../../docs/control/12_ACCEPTANCE_CORPUS.md).

## Admission boundary

- Files under `testdata/generated/` are not official corpus inputs until they are formally admitted under the corpus governance rules.
- Existing folder names are inventory groupings, not automatic acceptance classes.

See [manifest.json](./manifest.json) for per-deck metadata and risk notes.
