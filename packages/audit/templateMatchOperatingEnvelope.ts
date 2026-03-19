import type { AuditReport } from "./pptxAudit.ts";
import {
  summarizeTemplateMatchConfidenceSummary,
  type TemplateMatchConfidenceCapReason,
  type TemplateMatchConfidenceLabel
} from "./templateMatchConfidenceSummary.ts";

export type TemplateMatchOperatingEnvelopeResult =
  | "admittedMatch"
  | "rejectedMatch"
  | "ambiguousMatch";

export type TemplateAnchorDecisionRole =
  | "admittedCandidate"
  | "rejectedCandidate"
  | "ambiguousCandidate";

export type TemplateMatchOperatingEnvelopeReason =
  | "exactlyOneModerateExternalAnchor"
  | "noModerateExternalAnchor"
  | "conflictingBlockedAnchorPresent"
  | "multipleModerateExternalAnchors";

export interface TemplateMatchOperatingEnvelopeEvaluation {
  templateDeckId: string;
  templateFamilyId: string;
  confidenceLabel: TemplateMatchConfidenceLabel;
  decisionRole: TemplateAnchorDecisionRole;
  trustedPositiveDimensions: Array<"usageDistributionEvidence">;
  corroboratingDimensions: Array<
    "deckLevelDominantStyleSnapshot" | "dominantBodyStyleConsensus"
  >;
  blockedDimensions: Array<
    "deckLevelDominantStyleSnapshot" | "dominantBodyStyleConsensus"
  >;
  confidenceCapReasons: TemplateMatchConfidenceCapReason[];
}

export interface TemplateMatchOperatingEnvelopeSummary {
  claimScope: "externalTemplateAnchorsCurrentReliableFingerprintDimensionsOnly";
  templateIdentificationSolved: false;
  templateTargetedNormalizationAvailable: false;
  candidateDeckId: string;
  matchResult: TemplateMatchOperatingEnvelopeResult;
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  admittedConfidenceLabel: "moderate" | null;
  evaluatedTemplateCount: number;
  admittedTemplateCount: number;
  blockedTemplateCount: number;
  rejectedTemplateCount: number;
  decisionReasons: TemplateMatchOperatingEnvelopeReason[];
  evaluations: TemplateMatchOperatingEnvelopeEvaluation[];
  futureOnlyDimensionsExcluded: Array<
    | "repeatedLayoutModuleSignatures"
    | "placeholderRolePatterns"
    | "templateSlotSimilarity"
    | "slideFamilyClustering"
    | "templateMatchConfidenceTraits"
  >;
  outOfScopeDimensionsExcluded: Array<
    | "semanticNarrativeIntent"
    | "contentMeaning"
    | "aiStyleSimilarity"
    | "orgPolicyComplianceScoring"
    | "fullTemplateEnforcementSignals"
  >;
  summaryLine:
    | "External template operating envelope admits exactly one moderate-confidence template anchor and keeps template targeting inside the current conservative proof boundary."
    | "External template operating envelope rejects all evaluated anchors because no template reached the moderate-confidence admission gate."
    | "External template operating envelope is ambiguous because multiple or conflicting external template anchors remain viable under the current conservative proof boundary.";
}

export function summarizeTemplateMatchOperatingEnvelope(input: {
  candidate: {
    deckId: string;
    auditReport: AuditReport;
  };
  templates: Array<{
    deckId: string;
    familyId: string;
    auditReport: AuditReport;
  }>;
}): TemplateMatchOperatingEnvelopeSummary {
  if (input.templates.length === 0) {
    throw new Error("Template match operating envelope requires at least one template anchor.");
  }

  const evaluations = [...input.templates]
    .sort((left, right) => {
      const familyCompare = left.familyId.localeCompare(right.familyId);
      if (familyCompare !== 0) {
        return familyCompare;
      }
      return left.deckId.localeCompare(right.deckId);
    })
    .map((template): TemplateMatchOperatingEnvelopeEvaluation => {
      const confidenceSummary = summarizeTemplateMatchConfidenceSummary({
        candidate: input.candidate,
        template: {
          deckId: template.deckId,
          auditReport: template.auditReport
        }
      });

      return {
        templateDeckId: template.deckId,
        templateFamilyId: template.familyId,
        confidenceLabel: confidenceSummary.confidenceLabel,
        decisionRole: summarizeDecisionRole(confidenceSummary.confidenceLabel),
        trustedPositiveDimensions: confidenceSummary.trustedPositiveDimensions,
        corroboratingDimensions: confidenceSummary.corroboratingDimensions,
        blockedDimensions: confidenceSummary.blockedDimensions,
        confidenceCapReasons: confidenceSummary.confidenceCapReasons
      };
    });

  const admittedEvaluations = evaluations.filter(
    (evaluation) => evaluation.decisionRole === "admittedCandidate"
  );
  const ambiguousEvaluations = evaluations.filter(
    (evaluation) => evaluation.decisionRole === "ambiguousCandidate"
  );
  const rejectedEvaluations = evaluations.filter(
    (evaluation) => evaluation.decisionRole === "rejectedCandidate"
  );

  const result =
    admittedEvaluations.length === 1 && ambiguousEvaluations.length === 0
      ? "admittedMatch"
      : admittedEvaluations.length === 0 && ambiguousEvaluations.length === 0
        ? "rejectedMatch"
        : "ambiguousMatch";

  const admittedTemplate = result === "admittedMatch" ? admittedEvaluations[0] : null;
  const referenceEvaluation = evaluations[0];

  return {
    claimScope: "externalTemplateAnchorsCurrentReliableFingerprintDimensionsOnly",
    templateIdentificationSolved: false,
    templateTargetedNormalizationAvailable: false,
    candidateDeckId: input.candidate.deckId,
    matchResult: result,
    admittedTemplateDeckId: admittedTemplate?.templateDeckId ?? null,
    admittedTemplateFamilyId: admittedTemplate?.templateFamilyId ?? null,
    admittedConfidenceLabel: admittedTemplate?.confidenceLabel === "moderate" ? "moderate" : null,
    evaluatedTemplateCount: evaluations.length,
    admittedTemplateCount: admittedEvaluations.length,
    blockedTemplateCount: ambiguousEvaluations.length,
    rejectedTemplateCount: rejectedEvaluations.length,
    decisionReasons: summarizeDecisionReasons({
      admittedTemplateCount: admittedEvaluations.length,
      blockedTemplateCount: ambiguousEvaluations.length
    }),
    evaluations,
    futureOnlyDimensionsExcluded: referenceEvaluation
      ? [
        "repeatedLayoutModuleSignatures",
        "placeholderRolePatterns",
        "templateSlotSimilarity",
        "slideFamilyClustering",
        "templateMatchConfidenceTraits"
      ]
      : [],
    outOfScopeDimensionsExcluded: referenceEvaluation
      ? [
        "semanticNarrativeIntent",
        "contentMeaning",
        "aiStyleSimilarity",
        "orgPolicyComplianceScoring",
        "fullTemplateEnforcementSignals"
      ]
      : [],
    summaryLine:
      result === "admittedMatch"
        ? "External template operating envelope admits exactly one moderate-confidence template anchor and keeps template targeting inside the current conservative proof boundary."
        : result === "rejectedMatch"
          ? "External template operating envelope rejects all evaluated anchors because no template reached the moderate-confidence admission gate."
          : "External template operating envelope is ambiguous because multiple or conflicting external template anchors remain viable under the current conservative proof boundary."
  };
}

function summarizeDecisionRole(
  confidenceLabel: TemplateMatchConfidenceLabel
): TemplateAnchorDecisionRole {
  if (confidenceLabel === "moderate") {
    return "admittedCandidate";
  }
  if (confidenceLabel === "blocked") {
    return "ambiguousCandidate";
  }
  return "rejectedCandidate";
}

function summarizeDecisionReasons(input: {
  admittedTemplateCount: number;
  blockedTemplateCount: number;
}): TemplateMatchOperatingEnvelopeReason[] {
  if (input.admittedTemplateCount === 1 && input.blockedTemplateCount === 0) {
    return ["exactlyOneModerateExternalAnchor"];
  }
  if (input.admittedTemplateCount === 0 && input.blockedTemplateCount === 0) {
    return ["noModerateExternalAnchor"];
  }

  const reasons: TemplateMatchOperatingEnvelopeReason[] = [];
  if (input.admittedTemplateCount > 1) {
    reasons.push("multipleModerateExternalAnchors");
  }
  if (input.blockedTemplateCount > 0) {
    reasons.push("conflictingBlockedAnchorPresent");
  }
  return reasons;
}
