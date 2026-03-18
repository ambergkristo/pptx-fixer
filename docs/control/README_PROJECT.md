# PPTX FIXER - Project Control Pack

See kaust on projekti juhtimiskeskus ChatGPT + Codex toovoo jaoks.

## Eesmargid

Luua kitsas ja usaldusvaarne PowerPoint Corrector / PPTX Fixer:

- votab olemasoleva `.pptx` faili
- leiab vorminduse ebaulused
- parandab ainult ohutud vead
- sailitab struktuuri ja editability
- annab tagasi parandatud `.pptx` + raporti

## Current authority

- `11_TRUTH_RESET_ROADMAP.md` on ametlik aktiivne roadmap ja working statute.
- Teised control docs annavad konteksti, kuid ei tohi selle vastu sprintide scope'i ega sequencingut muuta.

## Kuidas seda kausta kasutada

1. Alusta failist `11_TRUTH_RESET_ROADMAP.md`
2. Loe seejarel `00_MASTERPLAN.md`
3. Kontrolli staatust failist `01_MILESTONES.md`
4. Kasuta Codexile promptimiseks faili `03_PROMPT_LIBRARY.md`
5. Tee iga sprinti review `04_CHATGPT_REVIEW_SYSTEM.md` jargi
6. Logi koik otsused `06_DECISION_LOG.md`
7. Logi iga tooseanss `07_SESSION_LOG_TEMPLATE.md` pohjal

## Toojaotus

ChatGPT

- strateegia
- scope control
- sprint review
- drift control

Codex

- koodi kirjutamine
- testid
- refaktor
- sprint implementation

Sina

- repo haldus
- testimine
- paris kasutajate valideerimine

## Pohireegel

Ara lase projektil driftida.

MVP EI sisalda:

- AI deck generation
- uute slaidide loomist
- narratiivi rewrite
- redesign engine

Ainult:

**audit + safe autofix + report + corrected pptx**
