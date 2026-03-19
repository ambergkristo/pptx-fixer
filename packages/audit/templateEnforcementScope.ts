import type { AuditReport } from "./pptxAudit.ts";
import {
  summarizeTemplateMatchOperatingEnvelope,
  type TemplateMatchOperatingEnvelopeSummary
} from "./templateMatchOperatingEnvelope.ts";

export type TemplateEnforcementClass =
  | "alignment"
  | "fontFamily"
  | "fontSize"
  | "lineSpacing"
  | "paragraphSpacing"
  | "bulletIndent";

export type TemplateEnforcementScopeDecision =
  | "enforcementEligible"
  | "enforcementBlocked"
  | "enforcementOutOfScope";

export type TemplateEnforcementClassDecision =
  | "inScope"
  | "blocked"
  | "outOfScope";

export type TemplateEnforcementScopeReason =
  | "admittedExternalAnchorPresent"
  | "admittedExternalTemplateMatchRequired"
  | "ambiguousTemplateMatchDisallowed"
  | "rejectedTemplateMatchDisallowed"
  | "classNotInNarrowEnforcementEnvelope"
  | "futureOnlyDimensionsRemainExcluded"
  | "outOfScopeDimensionsRemainExcluded";

export interface TemplateEnforcementClassSummary {
  className: TemplateEnforcementClass;
  classDecision: TemplateEnforcementClassDecision;
  reasons: TemplateEnforcementScopeReason[];
}

export interface TemplateEnforcementScopeSummary {
  claimScope: "narrowPhase5ScopeDefinitionOnly";
  enforcementBehaviorImplemented: false;
  defaultCleanupPathAffected: false;
  phase5CoreApprovedByThisHelper: false;
  productTruthChanged: false;
  candidateDeckId: string;
  scopeDecision: TemplateEnforcementScopeDecision;
  requestedClasses: TemplateEnforcementClass[];
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateMatchOperatingEnvelopeSummary["matchResult"];
  admissionPreconditions: {
    requiresAdmittedExternalTemplateMatch: true;
    ambiguousTemplateMatchDisallowed: true;
    blockedOrConflictingAnchorDisallowed: true;
    weakAndUnavailableConfidenceDisallowed: true;
    trustedPositiveEvidenceRulePreserved: true;
    futureOnlyDimensionsRemainExcluded: true;
    outOfScopeDimensionsRemainExcluded: true;
  };
  inScopeClasses: Array<"alignment" | "fontFamily">;
  blockedClasses: TemplateEnforcementClass[];
  outOfScopeClasses: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent">;
  classSummaries: TemplateEnforcementClassSummary[];
  decisionReasons: TemplateEnforcementScopeReason[];
  admittedExternalAnchorRequired: true;
  futureOnlyDimensionsExcluded: TemplateMatchOperatingEnvelopeSummary["futureOnlyDimensionsExcluded"];
  outOfScopeDimensionsExcluded: TemplateMatchOperatingEnvelopeSummary["outOfScopeDimensionsExcluded"];
  summaryLine:
    | "Template enforcement scope is eligible only because exactly one admitted external template anchor exists and requested classes stay inside the narrow current Phase 5 entry envelope."
    | "Template enforcement scope is blocked because the external template admission preconditions were not met under the current conservative proof boundary."
    | "Template enforcement scope is out of scope because requested classes fall outside the narrow current Phase 5 entry envelope.";
}

const IN_SCOPE_CLASSES: Array<"alignment" | "fontFamily"> = [
  "alignment",
  "fontFamily"
];

const OUT_OF_SCOPE_CLASSES: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent"> = [
  "fontSize",
  "lineSpacing",
  "paragraphSpacing",
  "bulletIndent"
];

export function summarizeTemplateEnforcementScope(input: {
  candidate: {
    deckId: string;
    auditReport: AuditReport;
  };
  templates: Array<{
    deckId: string;
    familyId: string;
    auditReport: AuditReport;
  }>;
  requestedClasses?: TemplateEnforcementClass[];
}): TemplateEnforcementScopeSummary {
  const requestedClasses = summarizeRequestedClasses(input.requestedClasses);
  const operatingEnvelope = summarizeTemplateMatchOperatingEnvelope({
    candidate: input.candidate,
    templates: input.templates
  });

  const classSummaries = requestedClasses.map((className) =>
    summarizeClassDecision({
      className,
      matchResult: operatingEnvelope.matchResult
    })
  );
  const inScopeClasses = classSummaries
    .filter(
      (summary): summary is TemplateEnforcementClassSummary & {
        className: "alignment" | "fontFamily";
        classDecision: "inScope";
      } => summary.classDecision === "inScope"
    )
    .map((summary) => summary.className);
  const blockedClasses = classSummaries
    .filter((summary) => summary.classDecision === "blocked")
    .map((summary) => summary.className);
  const outOfScopeClasses = classSummaries
    .filter(
      (summary): summary is TemplateEnforcementClassSummary & {
        className: "fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent";
        classDecision: "outOfScope";
      } => summary.classDecision === "outOfScope"
    )
    .map((summary) => summary.className);

  const scopeDecision =
    operatingEnvelope.matchResult !== "admittedMatch"
      ? "enforcementBlocked"
      : inScopeClasses.length > 0
        ? "enforcementEligible"
        : "enforcementOutOfScope";

  return {
    claimScope: "narrowPhase5ScopeDefinitionOnly",
    enforcementBehaviorImplemented: false,
    defaultCleanupPathAffected: false,
    phase5CoreApprovedByThisHelper: false,
    productTruthChanged: false,
    candidateDeckId: input.candidate.deckId,
    scopeDecision,
    requestedClasses,
    admittedTemplateDeckId: scopeDecision === "enforcementEligible"
      ? operatingEnvelope.admittedTemplateDeckId
      : null,
    admittedTemplateFamilyId: scopeDecision === "enforcementEligible"
      ? operatingEnvelope.admittedTemplateFamilyId
      : null,
    templateMatchResult: operatingEnvelope.matchResult,
    admissionPreconditions: {
      requiresAdmittedExternalTemplateMatch: true,
      ambiguousTemplateMatchDisallowed: true,
      blockedOrConflictingAnchorDisallowed: true,
      weakAndUnavailableConfidenceDisallowed: true,
      trustedPositiveEvidenceRulePreserved: true,
      futureOnlyDimensionsRemainExcluded: true,
      outOfScopeDimensionsRemainExcluded: true
    },
    inScopeClasses,
    blockedClasses,
    outOfScopeClasses,
    classSummaries,
    decisionReasons: summarizeDecisionReasons({
      scopeDecision,
      templateMatchResult: operatingEnvelope.matchResult
    }),
    admittedExternalAnchorRequired: true,
    futureOnlyDimensionsExcluded: operatingEnvelope.futureOnlyDimensionsExcluded,
    outOfScopeDimensionsExcluded: operatingEnvelope.outOfScopeDimensionsExcluded,
    summaryLine:
      scopeDecision === "enforcementEligible"
        ? "Template enforcement scope is eligible only because exactly one admitted external template anchor exists and requested classes stay inside the narrow current Phase 5 entry envelope."
        : scopeDecision === "enforcementOutOfScope"
          ? "Template enforcement scope is out of scope because requested classes fall outside the narrow current Phase 5 entry envelope."
          : "Template enforcement scope is blocked because the external template admission preconditions were not met under the current conservative proof boundary."
  };
}

function summarizeRequestedClasses(
  requestedClasses: TemplateEnforcementClass[] | undefined
): TemplateEnforcementClass[] {
  const allClasses: TemplateEnforcementClass[] = [
    ...IN_SCOPE_CLASSES,
    ...OUT_OF_SCOPE_CLASSES
  ];
  const base = requestedClasses ?? allClasses;
  return [...new Set(base)].sort((left, right) => left.localeCompare(right));
}

function summarizeClassDecision(input: {
  className: TemplateEnforcementClass;
  matchResult: TemplateMatchOperatingEnvelopeSummary["matchResult"];
}): TemplateEnforcementClassSummary {
  const classInScope = IN_SCOPE_CLASSES.includes(
    input.className as "alignment" | "fontFamily"
  );

  if (!classInScope) {
    return {
      className: input.className,
      classDecision: "outOfScope",
      reasons: ["classNotInNarrowEnforcementEnvelope"]
    };
  }

  if (input.matchResult !== "admittedMatch") {
    return {
      className: input.className,
      classDecision: "blocked",
      reasons: input.matchResult === "ambiguousMatch"
        ? ["ambiguousTemplateMatchDisallowed"]
        : ["rejectedTemplateMatchDisallowed", "admittedExternalTemplateMatchRequired"]
    };
  }

  return {
    className: input.className,
    classDecision: "inScope",
    reasons: ["admittedExternalAnchorPresent"]
  };
}

function summarizeDecisionReasons(input: {
  scopeDecision: TemplateEnforcementScopeDecision;
  templateMatchResult: TemplateMatchOperatingEnvelopeSummary["matchResult"];
}): TemplateEnforcementScopeReason[] {
  if (input.scopeDecision === "enforcementEligible") {
    return [
      "admittedExternalAnchorPresent",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
  }

  if (input.scopeDecision === "enforcementOutOfScope") {
    return [
      "classNotInNarrowEnforcementEnvelope",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
  }

  return input.templateMatchResult === "ambiguousMatch"
    ? [
      "ambiguousTemplateMatchDisallowed",
      "admittedExternalTemplateMatchRequired",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ]
    : [
      "rejectedTemplateMatchDisallowed",
      "admittedExternalTemplateMatchRequired",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
}
