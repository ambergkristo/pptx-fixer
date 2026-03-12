# PPTX FIXER — Project Control Pack

See kaust on projekti juhtimiskeskus ChatGPT + Codex töövoo jaoks.

## Eesmärk

Luua kitsas ja usaldusväärne **PowerPoint Corrector / PPTX Fixer**:

- võtab olemasoleva `.pptx` faili
- leiab vorminduse ebaühtlused
- parandab ainult ohutud vead
- säilitab struktuuri ja editability
- annab tagasi parandatud `.pptx` + raporti

## Kuidas seda kausta kasutada

1. Alusta failist `00_MASTERPLAN.md`
2. Juhi tööd faili `01_MILESTONES.md` järgi
3. Kasuta Codexile promptimiseks faili `03_PROMPT_LIBRARY.md`
4. Tee iga milestone lõpus ChatGPT review `04_CHATGPT_REVIEW_SYSTEM.md` järgi
5. Logi kõik otsused `06_DECISION_LOG.md`
6. Logi iga tööseanss `07_SESSION_LOG_TEMPLATE.md` põhjal

## Tööjaotus

ChatGPT
- strateegia
- scope control
- milestone review
- drift control

Codex
- koodi kirjutamine
- testid
- refaktor
- milestone implementation

Sina
- repo haldus
- testimine
- päris kasutajate valideerimine

## Põhireegel

Ära lase projektil driftida.

MVP EI sisalda:

- AI deck generation
- uute slaidide loomist
- narratiivi rewrite
- redesign engine

Ainult:

**audit + safe autofix + report + corrected pptx**
