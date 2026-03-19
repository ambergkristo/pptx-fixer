import type {
  TemplateEnforcementCoreReason,
  TemplateEnforcementCoreStatus
} from "../fix/runTemplateEnforcementCore.ts";
import type { TemplateEnforcementClass, TemplateEnforcementScopeDecision } from "./templateEnforcementScope.ts";
import type { TemplateMatchOperatingEnvelopeResult } from "./templateMatchOperatingEnvelope.ts";

export interface TemplateEnforcementReportSummarySource {
  enforcementStatus: TemplateEnforcementCoreStatus;
  requestedClasses: TemplateEnforcementClass[];
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateMatchOperatingEnvelopeResult;
  scopeDecision: TemplateEnforcementScopeDecision;
  appliedClasses: Array<"alignment" | "fontFamily">;
  blockedClasses: TemplateEnforcementClass[];
  untouchedOutOfScopeClasses: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent">;
  decisionReasons: TemplateEnforcementCoreReason[];
}

export interface TemplateEnforcementReportSummary {
  claimScope: "currentNarrowTemplateEnforcementReportingOnly";
  templateEnforcementAttempted: true;
  enforcementStatus: TemplateEnforcementCoreStatus;
  enforcementAllowed: boolean;
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateMatchOperatingEnvelopeResult;
  scopeDecision: TemplateEnforcementScopeDecision;
  requestedClasses: TemplateEnforcementClass[];
  appliedClasses: Array<"alignment" | "fontFamily">;
  blockedClasses: TemplateEnforcementClass[];
  untouchedOutOfScopeClasses: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent">;
  unchangedRequestedClasses: TemplateEnforcementClass[];
  decisionReasons: TemplateEnforcementCoreReason[];
  normalNonTemplateCleanupPathSeparate: true;
  summaryLine:
    | "Template enforcement reporting records a narrow admitted-template enforcement pass for currently in-scope classes only."
    | "Template enforcement reporting records a blocked outcome because admitted external-template preconditions were not satisfied."
    | "Template enforcement reporting records a no-op because requested classes were outside the current narrow enforcement envelope."
    | "Template enforcement reporting records a no-op because no safe in-scope template enforcement changes were applied.";
}

export function summarizeTemplateEnforcementReportSummary(
  input: TemplateEnforcementReportSummarySource
): TemplateEnforcementReportSummary {
  const unchangedRequestedClasses = input.requestedClasses.filter(
    (className) => !input.appliedClasses.includes(className as "alignment" | "fontFamily")
  );

  return {
    claimScope: "currentNarrowTemplateEnforcementReportingOnly",
    templateEnforcementAttempted: true,
    enforcementStatus: input.enforcementStatus,
    enforcementAllowed:
      input.templateMatchResult === "admittedMatch" &&
      input.scopeDecision === "enforcementEligible",
    admittedTemplateDeckId: input.admittedTemplateDeckId,
    admittedTemplateFamilyId: input.admittedTemplateFamilyId,
    templateMatchResult: input.templateMatchResult,
    scopeDecision: input.scopeDecision,
    requestedClasses: input.requestedClasses,
    appliedClasses: input.appliedClasses,
    blockedClasses: input.blockedClasses,
    untouchedOutOfScopeClasses: input.untouchedOutOfScopeClasses,
    unchangedRequestedClasses,
    decisionReasons: input.decisionReasons,
    normalNonTemplateCleanupPathSeparate: true,
    summaryLine: summarizeSummaryLine(input)
  };
}

function summarizeSummaryLine(
  input: TemplateEnforcementReportSummarySource
): TemplateEnforcementReportSummary["summaryLine"] {
  if (input.enforcementStatus === "enforcementApplied") {
    return "Template enforcement reporting records a narrow admitted-template enforcement pass for currently in-scope classes only.";
  }

  if (input.enforcementStatus === "enforcementBlocked") {
    return "Template enforcement reporting records a blocked outcome because admitted external-template preconditions were not satisfied.";
  }

  return input.scopeDecision === "enforcementOutOfScope"
    ? "Template enforcement reporting records a no-op because requested classes were outside the current narrow enforcement envelope."
    : "Template enforcement reporting records a no-op because no safe in-scope template enforcement changes were applied.";
}
