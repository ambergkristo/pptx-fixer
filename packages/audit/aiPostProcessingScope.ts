import type { AuditReport } from "./pptxAudit.ts";
import {
  summarizeTemplateEnforcementScope,
  type TemplateEnforcementClass,
  type TemplateEnforcementScopeSummary
} from "./templateEnforcementScope.ts";

export type AiPostProcessingClass =
  | TemplateEnforcementClass
  | "layoutRedesign"
  | "narrativeRewrite"
  | "slideGeneration"
  | "unsupportedStructureRepair";

export type AiPostProcessingScopeDecision =
  | "aiPostProcessingEligible"
  | "aiPostProcessingBlocked"
  | "aiPostProcessingOutOfScope";

export type AiPostProcessingClassDecision =
  | "inScope"
  | "blocked"
  | "outOfScope";

export type AiPostProcessingUnsupportedFailureMode =
  | "unsupportedStructureRepairRequired"
  | "layoutRedesignRequired"
  | "narrativeRewriteRequired";

export type AiPostProcessingScopeReason =
  | "admittedExternalAnchorPresent"
  | "admittedExternalTemplateMatchRequired"
  | "ambiguousTemplateMatchDisallowed"
  | "rejectedTemplateMatchDisallowed"
  | "classNotInNarrowAiPostProcessingEnvelope"
  | "unsupportedGeneratedDeckFailureMode"
  | "generatedDeckOutsideProvenEnvelope"
  | "generationOrRewriteBehaviorNotSupported"
  | "futureOnlyDimensionsRemainExcluded"
  | "outOfScopeDimensionsRemainExcluded";

export interface AiPostProcessingClassSummary {
  className: AiPostProcessingClass;
  classDecision: AiPostProcessingClassDecision;
  reasons: AiPostProcessingScopeReason[];
}

export interface AiPostProcessingScopeSummary {
  claimScope: "narrowPhase6ScopeDefinitionOnly";
  aiPipelineBehaviorImplemented: false;
  defaultCleanupPathAffected: false;
  phase6CoreApprovedByThisHelper: false;
  productTruthChanged: false;
  candidateDeckId: string;
  scopeDecision: AiPostProcessingScopeDecision;
  requestedClasses: AiPostProcessingClass[];
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateEnforcementScopeSummary["templateMatchResult"];
  unsupportedGeneratedDeckFailureModes: AiPostProcessingUnsupportedFailureMode[];
  admissionPreconditions: {
    generatedDeckInsideCurrentProvenEnvelopeRequired: true;
    requiresAdmittedExternalTemplateMatch: true;
    ambiguousTemplateMatchDisallowed: true;
    rejectedTemplateMatchDisallowed: true;
    blockedOrConflictingAnchorDisallowed: true;
    supportedClassesOnly: true;
    outOfScopeDimensionsRemainExcluded: true;
  };
  inScopeClasses: Array<"alignment" | "fontFamily">;
  blockedClasses: AiPostProcessingClass[];
  outOfScopeClasses: Array<
    | "fontSize"
    | "lineSpacing"
    | "paragraphSpacing"
    | "bulletIndent"
    | "layoutRedesign"
    | "narrativeRewrite"
    | "slideGeneration"
    | "unsupportedStructureRepair"
  >;
  classSummaries: AiPostProcessingClassSummary[];
  decisionReasons: AiPostProcessingScopeReason[];
  admittedExternalAnchorRequired: true;
  futureOnlyDimensionsExcluded: TemplateEnforcementScopeSummary["futureOnlyDimensionsExcluded"];
  outOfScopeDimensionsExcluded: TemplateEnforcementScopeSummary["outOfScopeDimensionsExcluded"];
  summaryLine:
    | "AI post-processing scope is eligible only because the generated deck remains inside the currently proven admitted-template envelope and requested classes stay inside the narrow current Phase 6 entry scope."
    | "AI post-processing scope is blocked because the generated deck falls outside the currently proven admitted-template envelope."
    | "AI post-processing scope is out of scope because requested AI cleanup classes fall outside the narrow current Phase 6 entry scope.";
}

const IN_SCOPE_CLASSES: Array<"alignment" | "fontFamily"> = [
  "alignment",
  "fontFamily"
];

const OUT_OF_SCOPE_CLASSES: Array<
  | "fontSize"
  | "lineSpacing"
  | "paragraphSpacing"
  | "bulletIndent"
  | "layoutRedesign"
  | "narrativeRewrite"
  | "slideGeneration"
  | "unsupportedStructureRepair"
> = [
  "fontSize",
  "lineSpacing",
  "paragraphSpacing",
  "bulletIndent",
  "layoutRedesign",
  "narrativeRewrite",
  "slideGeneration",
  "unsupportedStructureRepair"
];

export function summarizeAiPostProcessingScope(input: {
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
  unsupportedGeneratedDeckFailureModes?: AiPostProcessingUnsupportedFailureMode[];
}): AiPostProcessingScopeSummary {
  const requestedClasses = summarizeRequestedClasses(input.requestedClasses);
  const unsupportedGeneratedDeckFailureModes = summarizeUnsupportedFailureModes(
    input.unsupportedGeneratedDeckFailureModes
  );
  const enforcementScope = summarizeTemplateEnforcementScope({
    candidate: input.candidate,
    templates: input.templates,
    requestedClasses: requestedClasses.filter(isTemplateEnforcementClass)
  });

  const classSummaries = requestedClasses.map((className) =>
    summarizeClassDecision({
      className,
      enforcementScope,
      unsupportedGeneratedDeckFailureModes
    })
  );
  const inScopeClasses = classSummaries
    .filter(
      (summary): summary is AiPostProcessingClassSummary & {
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
      (summary): summary is AiPostProcessingClassSummary & {
        className:
          | "fontSize"
          | "lineSpacing"
          | "paragraphSpacing"
          | "bulletIndent"
          | "layoutRedesign"
          | "narrativeRewrite"
          | "slideGeneration"
          | "unsupportedStructureRepair";
        classDecision: "outOfScope";
      } => summary.classDecision === "outOfScope"
    )
    .map((summary) => summary.className);

  const scopeDecision =
    enforcementScope.templateMatchResult !== "admittedMatch" ||
      unsupportedGeneratedDeckFailureModes.length > 0
      ? "aiPostProcessingBlocked"
      : inScopeClasses.length > 0
        ? "aiPostProcessingEligible"
        : "aiPostProcessingOutOfScope";

  return {
    claimScope: "narrowPhase6ScopeDefinitionOnly",
    aiPipelineBehaviorImplemented: false,
    defaultCleanupPathAffected: false,
    phase6CoreApprovedByThisHelper: false,
    productTruthChanged: false,
    candidateDeckId: input.candidate.deckId,
    scopeDecision,
    requestedClasses,
    admittedTemplateDeckId: enforcementScope.admittedTemplateDeckId,
    admittedTemplateFamilyId: enforcementScope.admittedTemplateFamilyId,
    templateMatchResult: enforcementScope.templateMatchResult,
    unsupportedGeneratedDeckFailureModes,
    admissionPreconditions: {
      generatedDeckInsideCurrentProvenEnvelopeRequired: true,
      requiresAdmittedExternalTemplateMatch: true,
      ambiguousTemplateMatchDisallowed: true,
      rejectedTemplateMatchDisallowed: true,
      blockedOrConflictingAnchorDisallowed: true,
      supportedClassesOnly: true,
      outOfScopeDimensionsRemainExcluded: true
    },
    inScopeClasses,
    blockedClasses,
    outOfScopeClasses,
    classSummaries,
    decisionReasons: summarizeDecisionReasons({
      scopeDecision,
      templateMatchResult: enforcementScope.templateMatchResult,
      unsupportedGeneratedDeckFailureModes,
      outOfScopeClasses
    }),
    admittedExternalAnchorRequired: true,
    futureOnlyDimensionsExcluded: enforcementScope.futureOnlyDimensionsExcluded,
    outOfScopeDimensionsExcluded: enforcementScope.outOfScopeDimensionsExcluded,
    summaryLine:
      scopeDecision === "aiPostProcessingEligible"
        ? "AI post-processing scope is eligible only because the generated deck remains inside the currently proven admitted-template envelope and requested classes stay inside the narrow current Phase 6 entry scope."
        : scopeDecision === "aiPostProcessingOutOfScope"
          ? "AI post-processing scope is out of scope because requested AI cleanup classes fall outside the narrow current Phase 6 entry scope."
          : "AI post-processing scope is blocked because the generated deck falls outside the currently proven admitted-template envelope."
  };
}

function summarizeRequestedClasses(
  requestedClasses: AiPostProcessingClass[] | undefined
): AiPostProcessingClass[] {
  const allClasses: AiPostProcessingClass[] = [
    ...IN_SCOPE_CLASSES,
    ...OUT_OF_SCOPE_CLASSES
  ];
  const base = requestedClasses ?? allClasses;
  return [...new Set(base)].sort((left, right) => left.localeCompare(right));
}

function summarizeUnsupportedFailureModes(
  failureModes: AiPostProcessingUnsupportedFailureMode[] | undefined
): AiPostProcessingUnsupportedFailureMode[] {
  return [...new Set(failureModes ?? [])].sort((left, right) => left.localeCompare(right));
}

function isTemplateEnforcementClass(
  className: AiPostProcessingClass
): className is TemplateEnforcementClass {
  return [
    "alignment",
    "fontFamily",
    "fontSize",
    "lineSpacing",
    "paragraphSpacing",
    "bulletIndent"
  ].includes(className);
}

function summarizeClassDecision(input: {
  className: AiPostProcessingClass;
  enforcementScope: TemplateEnforcementScopeSummary;
  unsupportedGeneratedDeckFailureModes: AiPostProcessingUnsupportedFailureMode[];
}): AiPostProcessingClassSummary {
  const classInScope = IN_SCOPE_CLASSES.includes(
    input.className as "alignment" | "fontFamily"
  );

  if (!classInScope) {
    return {
      className: input.className,
      classDecision: "outOfScope",
      reasons: AI_BEHAVIOR_OUT_OF_SCOPE_CLASSES.has(
        input.className as
          | "layoutRedesign"
          | "narrativeRewrite"
          | "slideGeneration"
          | "unsupportedStructureRepair"
      )
        ? [
          "generationOrRewriteBehaviorNotSupported",
          "classNotInNarrowAiPostProcessingEnvelope"
        ]
        : ["classNotInNarrowAiPostProcessingEnvelope"]
    };
  }

  if (input.unsupportedGeneratedDeckFailureModes.length > 0) {
    return {
      className: input.className,
      classDecision: "blocked",
      reasons: [
        "unsupportedGeneratedDeckFailureMode",
        "generatedDeckOutsideProvenEnvelope"
      ]
    };
  }

  if (input.enforcementScope.templateMatchResult !== "admittedMatch") {
    return {
      className: input.className,
      classDecision: "blocked",
      reasons: input.enforcementScope.templateMatchResult === "ambiguousMatch"
        ? [
          "ambiguousTemplateMatchDisallowed",
          "admittedExternalTemplateMatchRequired",
          "generatedDeckOutsideProvenEnvelope"
        ]
        : [
          "rejectedTemplateMatchDisallowed",
          "admittedExternalTemplateMatchRequired",
          "generatedDeckOutsideProvenEnvelope"
        ]
    };
  }

  return {
    className: input.className,
    classDecision: "inScope",
    reasons: ["admittedExternalAnchorPresent"]
  };
}

const AI_BEHAVIOR_OUT_OF_SCOPE_CLASSES = new Set<
  "layoutRedesign" | "narrativeRewrite" | "slideGeneration" | "unsupportedStructureRepair"
>([
  "layoutRedesign",
  "narrativeRewrite",
  "slideGeneration",
  "unsupportedStructureRepair"
]);

function summarizeDecisionReasons(input: {
  scopeDecision: AiPostProcessingScopeDecision;
  templateMatchResult: TemplateEnforcementScopeSummary["templateMatchResult"];
  unsupportedGeneratedDeckFailureModes: AiPostProcessingUnsupportedFailureMode[];
  outOfScopeClasses: AiPostProcessingScopeSummary["outOfScopeClasses"];
}): AiPostProcessingScopeReason[] {
  if (input.scopeDecision === "aiPostProcessingEligible") {
    return [
      "admittedExternalAnchorPresent",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
  }

  if (input.scopeDecision === "aiPostProcessingOutOfScope") {
    const reasons: AiPostProcessingScopeReason[] = [
      "classNotInNarrowAiPostProcessingEnvelope",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
    if (
      input.outOfScopeClasses.some((className) =>
        AI_BEHAVIOR_OUT_OF_SCOPE_CLASSES.has(
          className as
            | "layoutRedesign"
            | "narrativeRewrite"
            | "slideGeneration"
            | "unsupportedStructureRepair"
        )
      )
    ) {
      reasons.splice(1, 0, "generationOrRewriteBehaviorNotSupported");
    }
    return reasons;
  }

  if (input.unsupportedGeneratedDeckFailureModes.length > 0) {
    return [
      "unsupportedGeneratedDeckFailureMode",
      "generatedDeckOutsideProvenEnvelope",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
  }

  return input.templateMatchResult === "ambiguousMatch"
    ? [
      "ambiguousTemplateMatchDisallowed",
      "admittedExternalTemplateMatchRequired",
      "generatedDeckOutsideProvenEnvelope",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ]
    : [
      "rejectedTemplateMatchDisallowed",
      "admittedExternalTemplateMatchRequired",
      "generatedDeckOutsideProvenEnvelope",
      "futureOnlyDimensionsRemainExcluded",
      "outOfScopeDimensionsRemainExcluded"
    ];
}
