# PPTX FIXER — Milestones

## M0 Problem Validation

Goal:

- kinnitada kasutajavalu
- koguda deck corpus

Deliverables

- 20 user interviews
- 30 test decki
- edge case map

Acceptance

- vähemalt 8 kasutajat ütleb et probleem on sage
- vähemalt 5 oleks nõus tööriista proovima

---

## M1 Audit Prototype

Goal

- parser
- issue detection
- lint report

Deliverables

- pptx ingest
- issue report
- font drift detection
- spacing issues

Acceptance

- audit töötab 80% test deckidel
- raport on arusaadav

---

## M2 Safe Autofix Engine

Goal

- parandada ainult madala riskiga formatting vead

Deliverables

- font normalization
- spacing normalization
- alignment cleanup
- safety rules

Acceptance

- autofix ei riku faili
- parandused on deterministlikud
- risky edit läheb warningusse

---

## M3 Corrected Export

Goal

- salvestada parandatud deck välja

Deliverables

- corrected pptx output
- before/after compare basics
- export validation

Acceptance

- väljundfail avaneb
- struktuur säilib
- parandused kajastuvad raportis

---

## M4 Packaging / MVP Usability

Goal

- teha tööriist kasutatavaks testimiseks

Deliverables

- simple CLI or local app flow
- input/output workflow
- readable logs
- sample corpus tests

Acceptance

- kasutaja saab faili sisse anda
- saab parandatud faili tagasi
- saab raporti tagasi
