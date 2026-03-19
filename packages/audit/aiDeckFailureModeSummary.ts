import type { AuditReport } from "./pptxAudit.ts";
import {
  summarizeAiPostProcessingScope,
  type AiPostProcessingClass,
  type AiPostProcessingScopeSummary,
  type AiPostProcessingUnsupportedFailureMode
} from "./aiPostProcessingScope.ts";

export type AiDeckFailureMode =
  | "templateMatchAdmissible"
  | "templateMatchAmbiguous"
  | "templateMatchRejected"
  | "unsupportedLayoutDrift"
  | "unsupportedNarrativeRewriteExpectation"
  | "unsupportedStructureRepairNeed"
  | "supportedNarrowNormalizationOnly"
  | "mixedSupportedAndUnsupportedIssues"
  | "highlyInconsistentGeneratedDeck";

export interface AiDeckFailureModeSummary {
  claimScope: "currentAiGeneratedDeckCorpusClassificationOnly";
  aiCleanupBehaviorImplemented: false;
  defaultCleanupPathAffected: false;
  productTruthChanged: false;
  candidateDeckId: string;
  requestedClasses: AiPostProcessingClass[];
  templateMatchResult: AiPostProcessingScopeSummary["templateMatchResult"];
  scopeDecision: AiPostProcessingScopeSummary["scopeDecision"];
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  failureModes: AiDeckFailureMode[];
  observedUnsupportedFailureModes: AiPostProcessingUnsupportedFailureMode[];
  supportedNarrowClasses: Array<"alignment" | "fontFamily">;
  outOfScopeRequestedClasses: AiPostProcessingScopeSummary["outOfScopeClasses"];
  activeDriftSignals: {
    alignment: boolean;
    fontFamily: boolean;
    fontSize: boolean;
    lineSpacing: boolean;
    paragraphSpacing: boolean;
    bulletIndent: boolean;
  };
  generatedDeckInsideProvenEnvelope: boolean;
  summaryLine:
    | "AI deck failure-mode summary identifies a generated deck that stays inside the current narrow admitted-template normalization envelope."
    | "AI deck failure-mode summary identifies a generated deck that overlaps with the current narrow envelope but still carries unsupported or mixed failure modes."
    | "AI deck failure-mode summary identifies a generated deck that must stay blocked because template admission is ambiguous or rejected under the current proof boundary.";
}

export function summarizeAiDeckFailureMode(input: {
  candidate: {
    deckId: string;
    auditReport: AuditReport;
  };
  templates: Array<{
    deckId: string;
    familyId: string;
    auditReport: AuditReport;
  }>;
  requestedClasses?: AiPostProcessingClass[];
  observedUnsupportedFailureModes?: AiPostProcessingUnsupportedFailureMode[];
}): AiDeckFailureModeSummary {
  const scope = summarizeAiPostProcessingScope({
    candidate: input.candidate,
    templates: input.templates,
    requestedClasses: input.requestedClasses,
    unsupportedGeneratedDeckFailureModes: input.observedUnsupportedFailureModes
  });
  const activeDriftSignals = summarizeActiveDriftSignals(input.candidate.auditReport);
  const failureModes = summarizeFailureModes({
    scope,
    activeDriftSignals,
    observedUnsupportedFailureModes: scope.unsupportedGeneratedDeckFailureModes,
    slideCount: input.candidate.auditReport.slideCount
  });
  const generatedDeckInsideProvenEnvelope =
    scope.templateMatchResult === "admittedMatch" &&
    scope.scopeDecision === "aiPostProcessingEligible" &&
    failureModes.includes("supportedNarrowNormalizationOnly");

  return {
    claimScope: "currentAiGeneratedDeckCorpusClassificationOnly",
    aiCleanupBehaviorImplemented: false,
    defaultCleanupPathAffected: false,
    productTruthChanged: false,
    candidateDeckId: input.candidate.deckId,
    requestedClasses: scope.requestedClasses,
    templateMatchResult: scope.templateMatchResult,
    scopeDecision: scope.scopeDecision,
    admittedTemplateDeckId: scope.admittedTemplateDeckId,
    admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
    failureModes,
    observedUnsupportedFailureModes: scope.unsupportedGeneratedDeckFailureModes,
    supportedNarrowClasses: scope.inScopeClasses,
    outOfScopeRequestedClasses: scope.outOfScopeClasses,
    activeDriftSignals,
    generatedDeckInsideProvenEnvelope,
    summaryLine: summarizeSummaryLine({
      templateMatchResult: scope.templateMatchResult,
      failureModes
    })
  };
}

function summarizeActiveDriftSignals(auditReport: AuditReport) {
  return {
    alignment: auditReport.alignmentDriftCount > 0,
    fontFamily: auditReport.fontDrift.driftRuns.length > 0,
    fontSize: auditReport.fontSizeDrift.driftRuns.length > 0,
    lineSpacing: auditReport.lineSpacingDriftCount > 0,
    paragraphSpacing: auditReport.spacingDriftCount > 0,
    bulletIndent: auditReport.bulletIndentDriftCount > 0
  };
}

function summarizeFailureModes(input: {
  scope: AiPostProcessingScopeSummary;
  activeDriftSignals: AiDeckFailureModeSummary["activeDriftSignals"];
  observedUnsupportedFailureModes: AiPostProcessingUnsupportedFailureMode[];
  slideCount: number;
}): AiDeckFailureMode[] {
  const failureModes = new Set<AiDeckFailureMode>();

  if (input.scope.templateMatchResult === "admittedMatch") {
    failureModes.add("templateMatchAdmissible");
  } else if (input.scope.templateMatchResult === "ambiguousMatch") {
    failureModes.add("templateMatchAmbiguous");
  } else {
    failureModes.add("templateMatchRejected");
  }

  if (input.observedUnsupportedFailureModes.includes("layoutRedesignRequired")) {
    failureModes.add("unsupportedLayoutDrift");
  }
  if (input.observedUnsupportedFailureModes.includes("narrativeRewriteRequired")) {
    failureModes.add("unsupportedNarrativeRewriteExpectation");
  }
  if (input.observedUnsupportedFailureModes.includes("unsupportedStructureRepairRequired")) {
    failureModes.add("unsupportedStructureRepairNeed");
  }

  const unsupportedDriftPresent =
    input.activeDriftSignals.fontSize ||
    input.activeDriftSignals.lineSpacing ||
    input.activeDriftSignals.paragraphSpacing ||
    input.activeDriftSignals.bulletIndent;
  const supportedDriftPresent =
    input.activeDriftSignals.alignment || input.activeDriftSignals.fontFamily;
  const activeDriftCategoryCount = Object.values(input.activeDriftSignals).filter(Boolean).length;
  const observedUnsupportedPresent = input.observedUnsupportedFailureModes.length > 0;

  if (
    activeDriftCategoryCount >= 3 ||
    (input.slideCount > 1 && supportedDriftPresent && unsupportedDriftPresent) ||
    input.observedUnsupportedFailureModes.includes("unsupportedStructureRepairRequired")
  ) {
    failureModes.add("highlyInconsistentGeneratedDeck");
  }

  if (
    input.scope.templateMatchResult === "admittedMatch" &&
    input.scope.scopeDecision === "aiPostProcessingEligible" &&
    supportedDriftPresent &&
    !unsupportedDriftPresent &&
    !observedUnsupportedPresent &&
    input.scope.outOfScopeClasses.length === 0
  ) {
    failureModes.add("supportedNarrowNormalizationOnly");
  } else if (
    input.scope.templateMatchResult === "admittedMatch" &&
    (unsupportedDriftPresent ||
      observedUnsupportedPresent ||
      input.scope.outOfScopeClasses.length > 0)
  ) {
    failureModes.add("mixedSupportedAndUnsupportedIssues");
  }

  return [...failureModes].sort((left, right) => left.localeCompare(right));
}

function summarizeSummaryLine(input: {
  templateMatchResult: AiPostProcessingScopeSummary["templateMatchResult"];
  failureModes: AiDeckFailureMode[];
}): AiDeckFailureModeSummary["summaryLine"] {
  if (
    input.templateMatchResult === "admittedMatch" &&
    input.failureModes.includes("supportedNarrowNormalizationOnly")
  ) {
    return "AI deck failure-mode summary identifies a generated deck that stays inside the current narrow admitted-template normalization envelope.";
  }

  if (input.templateMatchResult !== "admittedMatch") {
    return "AI deck failure-mode summary identifies a generated deck that must stay blocked because template admission is ambiguous or rejected under the current proof boundary.";
  }

  return "AI deck failure-mode summary identifies a generated deck that overlaps with the current narrow envelope but still carries unsupported or mixed failure modes.";
}
