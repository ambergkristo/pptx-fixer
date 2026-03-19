import type { AuditReport } from "./pptxAudit.ts";
import {
  summarizeAiPostProcessingScope,
  type AiPostProcessingClass,
  type AiPostProcessingScopeReason,
  type AiPostProcessingUnsupportedFailureMode
} from "./aiPostProcessingScope.ts";
import {
  summarizeAiDeckFailureMode,
  type AiDeckFailureMode,
  type AiDeckFailureModeSummary
} from "./aiDeckFailureModeSummary.ts";
import type { TemplateEnforcementReportSummary } from "./templateEnforcementReportSummary.ts";

export type AiPostProcessingReportReason =
  | AiPostProcessingScopeReason
  | "postProcessingNormalizationLayerOnly"
  | "aiPostProcessingNotAttempted"
  | "templateEnforcementApplied"
  | "templateEnforcementBlocked"
  | "templateEnforcementNoop"
  | "unsupportedFailureModesRemainUntouched";

export interface AiPostProcessingReportSummary {
  claimScope: "currentNarrowAiPostProcessingReportingOnly";
  aiPostProcessingAttempted: boolean;
  postProcessingNormalizationLayerOnly: true;
  generatorBehaviorClaimed: false;
  rewriteBehaviorClaimed: false;
  layoutRedesignClaimed: false;
  productTruthChanged: false;
  candidateDeckId: string;
  scopeDecision: ReturnType<typeof summarizeAiPostProcessingScope>["scopeDecision"];
  templateMatchResult: ReturnType<typeof summarizeAiPostProcessingScope>["templateMatchResult"];
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  requestedClasses: AiPostProcessingClass[];
  eligibleSupportedClasses: Array<"alignment" | "fontFamily">;
  appliedClasses: Array<"alignment" | "fontFamily">;
  blockedClasses: AiPostProcessingClass[];
  untouchedOutOfScopeClasses: ReturnType<typeof summarizeAiPostProcessingScope>["outOfScopeClasses"];
  untouchedUnsupportedFailureModes: AiPostProcessingUnsupportedFailureMode[];
  failureModes: AiDeckFailureMode[];
  enforcementStatus: TemplateEnforcementReportSummary["enforcementStatus"] | null;
  decisionReasons: AiPostProcessingReportReason[];
  summaryLine:
    | "AI post-processing reporting records a narrow admitted-template normalization pass only for currently proven supported classes."
    | "AI post-processing reporting records a blocked outcome because the generated deck falls outside the current admitted-template post-processing envelope."
    | "AI post-processing reporting records an out-of-scope outcome because requested behavior exceeds the current narrow post-processing envelope."
    | "AI post-processing reporting records that the deck stayed inside the narrow post-processing envelope, but no cleanup was attempted or applied.";
}

export function summarizeAiPostProcessingReportSummary(input: {
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
  templateEnforcementReport?: TemplateEnforcementReportSummary | null;
}): AiPostProcessingReportSummary {
  const scope = summarizeAiPostProcessingScope({
    candidate: input.candidate,
    templates: input.templates,
    requestedClasses: input.requestedClasses,
    unsupportedGeneratedDeckFailureModes: input.observedUnsupportedFailureModes
  });
  const failureModeSummary = summarizeAiDeckFailureMode({
    candidate: input.candidate,
    templates: input.templates,
    requestedClasses: input.requestedClasses,
    observedUnsupportedFailureModes: input.observedUnsupportedFailureModes
  });
  const aiPostProcessingAttempted = input.templateEnforcementReport !== undefined &&
    input.templateEnforcementReport !== null;
  const appliedClasses = input.templateEnforcementReport?.appliedClasses ?? [];
  const blockedClasses = summarizeBlockedClasses({
    scope,
    templateEnforcementReport: input.templateEnforcementReport
  });
  const decisionReasons = summarizeDecisionReasons({
    scope,
    failureModeSummary,
    templateEnforcementReport: input.templateEnforcementReport,
    aiPostProcessingAttempted
  });

  return {
    claimScope: "currentNarrowAiPostProcessingReportingOnly",
    aiPostProcessingAttempted,
    postProcessingNormalizationLayerOnly: true,
    generatorBehaviorClaimed: false,
    rewriteBehaviorClaimed: false,
    layoutRedesignClaimed: false,
    productTruthChanged: false,
    candidateDeckId: input.candidate.deckId,
    scopeDecision: scope.scopeDecision,
    templateMatchResult: scope.templateMatchResult,
    admittedTemplateDeckId: scope.admittedTemplateDeckId,
    admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
    requestedClasses: scope.requestedClasses,
    eligibleSupportedClasses: scope.inScopeClasses,
    appliedClasses,
    blockedClasses,
    untouchedOutOfScopeClasses: scope.outOfScopeClasses,
    untouchedUnsupportedFailureModes: failureModeSummary.observedUnsupportedFailureModes,
    failureModes: failureModeSummary.failureModes,
    enforcementStatus: input.templateEnforcementReport?.enforcementStatus ?? null,
    decisionReasons,
    summaryLine: summarizeSummaryLine({
      scopeDecision: scope.scopeDecision,
      enforcementStatus: input.templateEnforcementReport?.enforcementStatus ?? null
    })
  };
}

function summarizeBlockedClasses(input: {
  scope: ReturnType<typeof summarizeAiPostProcessingScope>;
  templateEnforcementReport: TemplateEnforcementReportSummary | null | undefined;
}): AiPostProcessingClass[] {
  return [...new Set([
    ...input.scope.blockedClasses,
    ...(input.templateEnforcementReport?.blockedClasses ?? [])
  ])].sort((left, right) => left.localeCompare(right));
}

function summarizeDecisionReasons(input: {
  scope: ReturnType<typeof summarizeAiPostProcessingScope>;
  failureModeSummary: AiDeckFailureModeSummary;
  templateEnforcementReport: TemplateEnforcementReportSummary | null | undefined;
  aiPostProcessingAttempted: boolean;
}): AiPostProcessingReportReason[] {
  const reasons = new Set<AiPostProcessingReportReason>([
    "postProcessingNormalizationLayerOnly",
    ...input.scope.decisionReasons
  ]);

  if (input.failureModeSummary.observedUnsupportedFailureModes.length > 0) {
    reasons.add("unsupportedFailureModesRemainUntouched");
  }

  if (!input.aiPostProcessingAttempted) {
    reasons.add("aiPostProcessingNotAttempted");
  } else if (input.templateEnforcementReport?.enforcementStatus === "enforcementApplied") {
    reasons.add("templateEnforcementApplied");
  } else if (input.templateEnforcementReport?.enforcementStatus === "enforcementBlocked") {
    reasons.add("templateEnforcementBlocked");
  } else if (input.templateEnforcementReport?.enforcementStatus === "enforcementNoop") {
    reasons.add("templateEnforcementNoop");
  }

  return [...reasons];
}

function summarizeSummaryLine(input: {
  scopeDecision: ReturnType<typeof summarizeAiPostProcessingScope>["scopeDecision"];
  enforcementStatus: TemplateEnforcementReportSummary["enforcementStatus"] | null;
}): AiPostProcessingReportSummary["summaryLine"] {
  if (input.enforcementStatus === "enforcementApplied") {
    return "AI post-processing reporting records a narrow admitted-template normalization pass only for currently proven supported classes.";
  }

  if (input.scopeDecision === "aiPostProcessingBlocked") {
    return "AI post-processing reporting records a blocked outcome because the generated deck falls outside the current admitted-template post-processing envelope.";
  }

  if (input.scopeDecision === "aiPostProcessingOutOfScope") {
    return "AI post-processing reporting records an out-of-scope outcome because requested behavior exceeds the current narrow post-processing envelope.";
  }

  return "AI post-processing reporting records that the deck stayed inside the narrow post-processing envelope, but no cleanup was attempted or applied.";
}
