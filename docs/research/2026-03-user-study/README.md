# PPTX Fixer User Study (March 2026)

## Purpose of the Study

The purpose of this user study was to validate whether formatting problems in PowerPoint presentations represent a recurring workflow pain for professionals who regularly prepare presentations, and whether a dedicated audit and cleanup tool would be useful.

The study was conducted as an early validation step for the PPTX Fixer product concept.

The goal was not statistical significance but clear directional validation before starting MVP development.

## Study Artifact

- Raw responses: [pptx-user-study-20-respondents.csv](/C:/Users/Kasutaja/pptx-fixer/docs/research/2026-03-user-study/pptx-user-study-20-respondents.csv)
- Response count: 20
- Collection window: March 10 to March 12, 2026

## Respondent Profile Summary

The respondent group represents working professionals who regularly prepare or edit presentation decks. The source CSV does not contain an explicit role column, but the study prompt and response pattern support the intended profile:

- product managers
- marketing managers
- marketing specialists
- sales managers
- mid-level business managers involved in presentation preparation

PowerPoint usage frequency shows regular exposure to the problem space:

- 10 of 20 use PowerPoint at least weekly
- 3 of 20 use it daily
- 7 of 20 use it multiple times per week

Typical use cases referenced in the study brief:

- internal reporting decks
- marketing presentations
- sales presentations
- executive briefings
- investor and partner presentations

## Key Findings

### 1. Formatting problems are frequent

15 of 20 respondents reported that they need to fix formatting issues either `sageli` or `peaaegu iga kord`.

Most frequently cited problem categories in the raw data:

- text spacing inconsistency: 14 mentions
- font inconsistency: 14 mentions
- layout breakage: 9 mentions
- bullet spacing inconsistency: 9 mentions
- object misalignment: 8 mentions
- color inconsistency: 6 mentions
- template rigidity / hard-coded design constraints: 1 explicit mention

These problems often appear after slides are copied from different decks or edited by multiple contributors.

### 2. Cleanup work is manual and repetitive

14 of 20 respondents said they handle problems manually. Only 4 mentioned using Slide Master as part of the workflow.

Typical cleanup time per deck:

- 7 of 20: 10 to 20 minutes
- 5 of 20: 20 to 40 minutes
- 5 of 20: 5 to 10 minutes
- 2 of 20: over 40 minutes

The work described is repetitive, necessary, and low-value relative to the presentation's actual business purpose.

### 3. Strong interest in an automatic audit tool

16 of 20 respondents said they would definitely or probably use a tool that:

- scans a PowerPoint file
- identifies formatting inconsistencies
- provides a clear issue report

The idea of a PowerPoint audit or lint tool is aligned with the problem reported in the dataset.

### 4. Interest increases further with safe automatic fixes

17 of 20 respondents said they would definitely or probably use a tool that also applies only safe automatic fixes.

The signal is positive for later autofix work, but the responses still point toward transparent and controlled cleanup, not aggressive redesign behavior.

### 5. Security and confidentiality concerns are material

9 of 20 respondents explicitly raised confidentiality or file security concerns.

This supports product requirements around:

- secure file handling
- local processing or strong privacy guarantees
- clear communication about what happens to uploaded files

## Adoption Signal

The study indicates a strong early adoption signal.

- a clear majority experience formatting problems frequently
- 16 of 20 would definitely or probably use a detection tool
- 17 of 20 would test a beta or answered `võib-olla`
- 17 of 20 would definitely or probably use safe automatic fixes later

This is sufficient directional evidence that the problem is real, recurring, and worth building against.

## Trust and Security Concerns

Trust is a product requirement, not a secondary concern.

The raw responses repeatedly mention:

- confidentiality
- file security
- caution around presentation upload

Implication: early product messaging and architecture should bias toward safe handling and transparent reporting. This is especially important because real decks may contain internal company data, financial data, strategy material, and partner-facing content.

## Product Implications for M1 and M2

### M1 Audit Prototype

The first useful capability should be:

- ingest a `.pptx`
- detect obvious formatting inconsistencies
- produce a structured issue report

The strongest M1 candidates supported by this study are:

- font drift detection
- bullet spacing inconsistency detection
- text or paragraph spacing inconsistency detection
- warning-only reporting for layout breakage and misalignment until confidence is higher

### M2 Safe Autofix

Autofix should follow only after detection is stable and trustworthy.

Priority candidates:

- font normalization
- bullet spacing correction
- simple text spacing normalization
- narrowly scoped alignment fixes where confidence is high

Out of scope for early milestones:

- slide generation
- redesign recommendations
- template redesign
- aggressive layout rewriting

## Limitations of the Study

This research has several limitations:

- small sample size of 20 respondents
- respondent roles are inferred from study framing rather than captured as a dedicated CSV field
- qualitative directional signal rather than statistical proof

These limitations do not invalidate the result for early milestone control.

## Conclusion

The user study confirms that PowerPoint formatting cleanup is a common and frustrating task for professionals.

The results support proceeding with the PPTX Fixer MVP direction focused on:

- detecting formatting inconsistencies
- reporting issues clearly
- introducing safe and controlled autofixes later

M0 interview validation is sufficient to proceed, but full M0 closure still requires deck corpus and edge case mapping.
