# PPTX FIXER Lint Rules v1

This document is preliminary and based on M0 findings. It is a draft rule catalog for later work, not implementation.

## Draft Rules

- `RULE_001` Font inconsistency: Detect mismatched font properties where content should be visually consistent.
- `RULE_002` Bullet spacing drift: Detect inconsistent bullet indentation or bullet-to-text spacing.
- `RULE_003` Paragraph spacing inconsistency: Detect uneven paragraph spacing within repeated content patterns.
- `RULE_004` Text alignment inconsistency: Detect text elements that break expected alignment within the same layout pattern.
- `RULE_005` Object alignment drift: Detect misaligned objects that should share a common edge or grid.
- `RULE_006` Repeated object spacing inconsistency: Detect uneven spacing between repeated peer objects.
- `RULE_007` Color inconsistency: Detect inconsistent text, fill, or line colors in equivalent content.

## Out of Scope for Lint Rules

- Narrative quality
- Redesign suggestions
- Slide generation
- Chart restyling
- SmartArt transformation
