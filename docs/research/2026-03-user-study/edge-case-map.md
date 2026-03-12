# PPTX Fixer Edge Case Map from User Study

## Purpose

This document extracts practical formatting problem categories from the March 2026 user study and maps them to the earliest milestone where they should be handled.

Scope rule: this is for cleanup, audit, and safe consistency fixes only. It does not imply slide generation, redesign, or narrative rewriting.

## Font Inconsistency

Why it matters:
Mixed fonts were one of the two most frequently reported issues. They are easy for users to notice and often create visible trust loss in decks that should look polished.

Milestone fit:
M1 detection
M2 safe autofix

Risk notes:
Theme inheritance, placeholder defaults, and intentional emphasis can create false positives. Detection should start with obvious drift in repeated text patterns, and autofix should avoid cases where local overrides may be intentional.

## Bullet Spacing Inconsistency

Why it matters:
Bullet spacing drift was repeatedly mentioned and is a classic cleanup problem when slides are copied across decks or edited by multiple people.

Milestone fit:
M1 detection
M2 safe autofix

Risk notes:
Nested bullet levels and intentionally different list structures can look inconsistent while still being correct. Autofix should only touch high-confidence cases inside clearly repeated list patterns.

## Text Spacing Inconsistency

Why it matters:
Text or paragraph spacing inconsistency was tied for the highest-frequency issue in the study. It is tedious to clean manually and fits the audit-first product direction.

Milestone fit:
M1 detection
M2 safe autofix

Risk notes:
Spacing may be inherited from layout or theme settings rather than stored as explicit local formatting. Detection should begin with explicit paragraph property differences before attempting broader normalization.

## Object Misalignment

Why it matters:
Misaligned shapes and text boxes were reported often enough to matter and are visually obvious in professional presentations.

Milestone fit:
M1 detection
Warning-only until confidence is proven

Risk notes:
Intentional asymmetry, grouping, and hidden alignment anchors make this riskier than font or text spacing cleanup. Early handling should stay detection-only and avoid movement in M2 until corpus evidence is stronger.

## Color Inconsistency

Why it matters:
Color inconsistency reduces visual cohesion and often appears after copied slides or manual overrides.

Milestone fit:
M1 detection
Warning-only in early M2 planning

Risk notes:
Color variation can be intentional for semantic emphasis, chart encoding, or section structure. Safe autofix confidence is lower than for fonts and spacing, so early product behavior should be detection-first.

## Layout Breakage

Why it matters:
Broken layouts were one of the most common reported problems and are highly visible to end users.

Milestone fit:
M1 detection
Warning-only

Risk notes:
Layout breakage is broad and can involve placeholders, masters, object overlap, clipping, or copied-slide damage. This category is important for audit value but too risky for early autofix.

## Template Rigidity / Hard-Coded Design Constraints

Why it matters:
One explicit response called out templates with hard-coded design behavior that are difficult to adapt. This highlights real-world decks where cleanup interacts with locked-in layout assumptions.

Milestone fit:
M1 detection
Warning-only

Risk notes:
This is not a signal to build template redesign. It is a signal to warn when a deck may be constrained by template structure or local overrides. Safe autofix should avoid these cases by default.

## Operational Guidance

Strongest near-term implementation candidates:

- M1: font drift detection
- M1: bullet spacing inconsistency detection
- M1: text or paragraph spacing inconsistency detection

Early warning-only categories:

- object misalignment
- color inconsistency
- layout breakage
- template rigidity and hard-coded design constraints

The edge-case map should be expanded later with deck corpus observations from real or sanitized `.pptx` files.
