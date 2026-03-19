import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { analyzeSlides, loadPresentation } from "../packages/audit/pptxAudit.ts";
import { summarizeFingerprintExtractionReliabilitySummary } from "../packages/audit/fingerprintExtractionReliabilitySummary.ts";

async function loadAudit(relPath: string) {
  return analyzeSlides(await loadPresentation(path.resolve(relPath)));
}

test("summarizes current extractable fingerprint dimensions across a real corpus subset", async () => {
  const summary = summarizeFingerprintExtractionReliabilitySummary({
    deckReports: [
      {
        deckId: "alignment-body-style-drift",
        auditReport: await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx")
      },
      {
        deckId: "line-spacing-combined-drift",
        auditReport: await loadAudit("testdata/corpus/spacing/line-spacing-combined-drift.pptx")
      },
      {
        deckId: "paragraph-spacing-combined-drift",
        auditReport: await loadAudit("testdata/corpus/spacing/paragraph-spacing-combined-drift.pptx")
      },
      {
        deckId: "template-placeholders",
        auditReport: await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx")
      }
    ]
  });

  assert.deepEqual(summary, {
    claimScope: "currentEvidenceBackedFingerprintDimensionsOnly",
    templateIntelligenceRuntimeAvailable: false,
    deckCount: 4,
    deckSummaries: [
      {
        deckId: "alignment-body-style-drift",
        deckLevelDominantStyleSnapshot: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 3,
          unresolvedFieldCount: 3
        },
        paragraphGroupStyleSignatures: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 9,
          unresolvedFieldCount: 12,
          totalParagraphGroups: 3,
          groupsWithAnyResolvedStyleFieldCount: 3,
          groupsWithOnlyNullStyleFieldsCount: 0
        },
        dominantBodyStyleConsensus: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 3,
          unresolvedFieldCount: 3,
          slideCount: 1,
          slidesWithAnyResolvedConsensusCount: 1,
          slidesWithOnlyNullConsensusCount: 0
        },
        usageDistributionEvidence: {
          outputState: "deterministicFull",
          resolvedFieldCount: 4,
          unresolvedFieldCount: 0,
          slideCount: 1,
          dominantCoverageAvailable: true,
          deckHistogramAvailable: true,
          slidesWithFontUsageHistogramCount: 1
        }
      },
      {
        deckId: "line-spacing-combined-drift",
        deckLevelDominantStyleSnapshot: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 3,
          unresolvedFieldCount: 3
        },
        paragraphGroupStyleSignatures: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 18,
          unresolvedFieldCount: 24,
          totalParagraphGroups: 6,
          groupsWithAnyResolvedStyleFieldCount: 6,
          groupsWithOnlyNullStyleFieldsCount: 0
        },
        dominantBodyStyleConsensus: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 6,
          unresolvedFieldCount: 6,
          slideCount: 2,
          slidesWithAnyResolvedConsensusCount: 2,
          slidesWithOnlyNullConsensusCount: 0
        },
        usageDistributionEvidence: {
          outputState: "deterministicFull",
          resolvedFieldCount: 4,
          unresolvedFieldCount: 0,
          slideCount: 2,
          dominantCoverageAvailable: true,
          deckHistogramAvailable: true,
          slidesWithFontUsageHistogramCount: 2
        }
      },
      {
        deckId: "paragraph-spacing-combined-drift",
        deckLevelDominantStyleSnapshot: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 4,
          unresolvedFieldCount: 2
        },
        paragraphGroupStyleSignatures: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 22,
          unresolvedFieldCount: 20,
          totalParagraphGroups: 6,
          groupsWithAnyResolvedStyleFieldCount: 6,
          groupsWithOnlyNullStyleFieldsCount: 0
        },
        dominantBodyStyleConsensus: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 8,
          unresolvedFieldCount: 4,
          slideCount: 2,
          slidesWithAnyResolvedConsensusCount: 2,
          slidesWithOnlyNullConsensusCount: 0
        },
        usageDistributionEvidence: {
          outputState: "deterministicFull",
          resolvedFieldCount: 4,
          unresolvedFieldCount: 0,
          slideCount: 2,
          dominantCoverageAvailable: true,
          deckHistogramAvailable: true,
          slidesWithFontUsageHistogramCount: 2
        }
      },
      {
        deckId: "template-placeholders",
        deckLevelDominantStyleSnapshot: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 2,
          unresolvedFieldCount: 4
        },
        paragraphGroupStyleSignatures: {
          outputState: "deterministicPartial",
          resolvedFieldCount: 6,
          unresolvedFieldCount: 22,
          totalParagraphGroups: 4,
          groupsWithAnyResolvedStyleFieldCount: 3,
          groupsWithOnlyNullStyleFieldsCount: 1
        },
        dominantBodyStyleConsensus: {
          outputState: "deterministicNull",
          resolvedFieldCount: 0,
          unresolvedFieldCount: 12,
          slideCount: 2,
          slidesWithAnyResolvedConsensusCount: 0,
          slidesWithOnlyNullConsensusCount: 2
        },
        usageDistributionEvidence: {
          outputState: "deterministicFull",
          resolvedFieldCount: 4,
          unresolvedFieldCount: 0,
          slideCount: 2,
          dominantCoverageAvailable: true,
          deckHistogramAvailable: true,
          slidesWithFontUsageHistogramCount: 2
        }
      }
    ],
    aggregateDimensionCounts: {
      deckLevelDominantStyleSnapshot: {
        deterministicFull: 0,
        deterministicPartial: 4,
        deterministicNull: 0
      },
      paragraphGroupStyleSignatures: {
        deterministicFull: 0,
        deterministicPartial: 4,
        deterministicNull: 0
      },
      dominantBodyStyleConsensus: {
        deterministicFull: 0,
        deterministicPartial: 3,
        deterministicNull: 1
      },
      usageDistributionEvidence: {
        deterministicFull: 4,
        deterministicPartial: 0,
        deterministicNull: 0
      }
    },
    futureOnlyDimensions: [
      "repeatedLayoutModuleSignatures",
      "placeholderRolePatterns",
      "templateSlotSimilarity",
      "slideFamilyClustering",
      "templateMatchConfidenceTraits"
    ],
    outOfScopeDimensions: [
      "semanticNarrativeIntent",
      "contentMeaning",
      "aiStyleSimilarity",
      "orgPolicyComplianceScoring",
      "fullTemplateEnforcementSignals"
    ],
    summaryLine: "Fingerprint extraction reliability is currently limited to evidence-backed style snapshot, group-signature, dominant-body-style, and usage-distribution dimensions; template intelligence remains unimplemented."
  });
});

test("is deterministic across repeated extraction on the same deck set", async () => {
  const input = {
    deckReports: [
      {
        deckId: "alignment-body-style-drift",
        auditReport: await loadAudit("testdata/corpus/alignment/alignment-body-style-drift.pptx")
      },
      {
        deckId: "template-placeholders",
        auditReport: await loadAudit("testdata/corpus/template-heavy/template-placeholders.pptx")
      }
    ]
  };

  assert.deepEqual(
    summarizeFingerprintExtractionReliabilitySummary(input),
    summarizeFingerprintExtractionReliabilitySummary(input)
  );
});

test("rejects empty deck sets and keeps future-only dimensions out of current extraction", () => {
  assert.throws(
    () => summarizeFingerprintExtractionReliabilitySummary({ deckReports: [] }),
    /requires at least one deck report/
  );

  const summary = summarizeFingerprintExtractionReliabilitySummary({
    deckReports: [
      {
        deckId: "synthetic",
        auditReport: {
          file: "synthetic",
          slideCount: 1,
          slides: [],
          deckFontUsage: {
            fontFamilyHistogram: {},
            fontSizeHistogram: {},
            dominantFontFamilyCoverage: 0,
            dominantFontSizeCoverage: 0
          },
          deckStyleFingerprint: {
            fontFamily: null,
            fontSize: null,
            alignment: null,
            lineSpacing: null,
            spacingBefore: null,
            spacingAfter: null
          },
          fontDriftSeverity: "low",
          deckQaSummary: {
            brandScore: 100,
            qualityLabel: "good",
            summaryLine: "Deck is mostly consistent with minor formatting drift.",
            keyIssues: [],
            fixImpact: {
              changedSlides: 0,
              totalChanges: 0
            }
          },
          topProblemSlides: [],
          fontsUsed: [],
          fontSizesUsed: [],
          fontDrift: {
            dominantFont: null,
            driftRuns: []
          },
          fontSizeDrift: {
            dominantSizePt: null,
            driftRuns: []
          },
          spacingDrift: {
            driftParagraphs: []
          },
          spacingDriftCount: 0,
          bulletIndentDrift: {
            driftParagraphs: []
          },
          bulletIndentDriftCount: 0,
          lineSpacingDrift: {
            driftParagraphs: []
          },
          lineSpacingDriftCount: 0,
          alignmentDrift: {
            driftParagraphs: []
          },
          alignmentDriftCount: 0
        }
      }
    ]
  });

  assert.equal(summary.templateIntelligenceRuntimeAvailable, false);
  assert.deepEqual(summary.futureOnlyDimensions, [
    "repeatedLayoutModuleSignatures",
    "placeholderRolePatterns",
    "templateSlotSimilarity",
    "slideFamilyClustering",
    "templateMatchConfidenceTraits"
  ]);
  assert.deepEqual(summary.outOfScopeDimensions, [
    "semanticNarrativeIntent",
    "contentMeaning",
    "aiStyleSimilarity",
    "orgPolicyComplianceScoring",
    "fullTemplateEnforcementSignals"
  ]);
});
