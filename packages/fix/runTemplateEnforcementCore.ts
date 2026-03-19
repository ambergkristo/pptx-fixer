import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import {
  analyzeSlides,
  loadPresentation,
  type AuditReport,
  type LoadedPresentation
} from "../audit/pptxAudit.ts";
import {
  summarizeTemplateEnforcementScope,
  type TemplateEnforcementClass,
  type TemplateEnforcementScopeSummary
} from "../audit/templateEnforcementScope.ts";
import {
  summarizeTemplateMatchOperatingEnvelope,
  type TemplateMatchOperatingEnvelopeSummary
} from "../audit/templateMatchOperatingEnvelope.ts";
import {
  summarizeTemplateEnforcementReportSummary,
  type TemplateEnforcementReportSummary
} from "../audit/templateEnforcementReportSummary.ts";
import { applyDominantBodyStyleFixToArchive } from "./dominantBodyStyleFix.ts";
import { applyFontFamilyFixToArchive } from "./fontFamilyFix.ts";

export type TemplateEnforcementCoreStatus =
  | "enforcementApplied"
  | "enforcementBlocked"
  | "enforcementNoop";

export type TemplateEnforcementCoreReason =
  | "admittedExternalTemplateRequired"
  | "ambiguousTemplateMatchBlocked"
  | "rejectedTemplateMatchBlocked"
  | "requestedClassesOutsideCurrentScope"
  | "templateAnchorResolutionFailed"
  | "templateAlignmentTargetUnavailable"
  | "templateFontFamilyTargetUnavailable"
  | "alignmentStageProducedOutOfScopeChanges"
  | "noSafeInScopeChanges"
  | "defaultCleanupPathUnaffected";

export interface TemplateEnforcementCoreResult {
  enforcementName: "templateEnforcementCore";
  claimScope: "narrowAdmittedExternalTemplateEnforcementOnly";
  explicitTemplateInvocationRequired: true;
  defaultCleanupPathAffected: false;
  productTruthChanged: false;
  enforcementStatus: TemplateEnforcementCoreStatus;
  candidateDeckId: string;
  requestedClasses: TemplateEnforcementClass[];
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateMatchOperatingEnvelopeSummary["matchResult"];
  scopeDecision: TemplateEnforcementScopeSummary["scopeDecision"];
  appliedClasses: Array<"alignment" | "fontFamily">;
  blockedClasses: TemplateEnforcementClass[];
  untouchedOutOfScopeClasses: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent">;
  stageChangeCounts: {
    alignmentChanges: number;
    fontFamilyChanges: number;
  };
  verification: {
    fontDriftBefore: number;
    fontDriftAfter: number;
    alignmentDriftBefore: number;
    alignmentDriftAfter: number;
  };
  decisionReasons: TemplateEnforcementCoreReason[];
  operatingEnvelope: TemplateMatchOperatingEnvelopeSummary;
  scope: TemplateEnforcementScopeSummary;
  reportSummary: TemplateEnforcementReportSummary;
  summaryLine:
    | "Template enforcement core applied a narrow admitted-template pass for currently in-scope classes only."
    | "Template enforcement core was blocked because admitted external-template preconditions were not satisfied."
    | "Template enforcement core produced a no-op because no requested class was safely enforceable inside the current narrow envelope.";
}

interface ResolvedTemplateInput {
  inputPath: string;
  deckId: string;
  familyId: string;
  auditReport: AuditReport;
}

export async function runTemplateEnforcementCore(input: {
  candidateInputPath: string;
  outputPath: string;
  templates: Array<{
    inputPath: string;
    deckId?: string;
    familyId: string;
  }>;
  requestedClasses?: TemplateEnforcementClass[];
}): Promise<TemplateEnforcementCoreResult> {
  const resolvedInputPath = path.resolve(input.candidateInputPath);
  const resolvedOutputPath = path.resolve(input.outputPath);
  if (resolvedInputPath === resolvedOutputPath) {
    throw new Error("Output path must differ from input path.");
  }
  if (input.templates.length === 0) {
    throw new Error("Template enforcement core requires at least one external template anchor.");
  }

  const candidatePresentation = await loadPresentation(resolvedInputPath);
  const candidateAuditReport = analyzeSlides(candidatePresentation);
  const candidateDeckId = path.basename(resolvedInputPath);
  const templateInputs = await Promise.all(
    input.templates.map(async (template) => {
      const templateInputPath = path.resolve(template.inputPath);
      const templateDeckId = template.deckId ?? path.basename(templateInputPath);
      const templatePresentation = await loadPresentation(templateInputPath);
      return {
        inputPath: templateInputPath,
        deckId: templateDeckId,
        familyId: template.familyId,
        auditReport: analyzeSlides(templatePresentation)
      } satisfies ResolvedTemplateInput;
    })
  );

  const operatingEnvelope = summarizeTemplateMatchOperatingEnvelope({
    candidate: {
      deckId: candidateDeckId,
      auditReport: candidateAuditReport
    },
    templates: templateInputs.map((template) => ({
      deckId: template.deckId,
      familyId: template.familyId,
      auditReport: template.auditReport
    }))
  });
  const scope = summarizeTemplateEnforcementScope({
    candidate: {
      deckId: candidateDeckId,
      auditReport: candidateAuditReport
    },
    templates: templateInputs.map((template) => ({
      deckId: template.deckId,
      familyId: template.familyId,
      auditReport: template.auditReport
    })),
    requestedClasses: input.requestedClasses
  });

  const inputBuffer = await readFile(resolvedInputPath);

  if (scope.scopeDecision === "enforcementBlocked") {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return buildBlockedResult({
      candidateDeckId,
      inputAuditReport: candidateAuditReport,
      requestedClasses: scope.requestedClasses,
      blockedClasses: scope.blockedClasses,
      untouchedOutOfScopeClasses: scope.outOfScopeClasses,
      admittedTemplateDeckId: scope.admittedTemplateDeckId,
      admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
      templateMatchResult: scope.templateMatchResult,
      operatingEnvelope,
      scope
    });
  }

  if (scope.scopeDecision === "enforcementOutOfScope") {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return buildNoopResult({
      candidateDeckId,
      inputAuditReport: candidateAuditReport,
      requestedClasses: scope.requestedClasses,
      blockedClasses: [],
      untouchedOutOfScopeClasses: scope.outOfScopeClasses,
      admittedTemplateDeckId: scope.admittedTemplateDeckId,
      admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
      templateMatchResult: scope.templateMatchResult,
      decisionReasons: [
        "requestedClassesOutsideCurrentScope",
        "defaultCleanupPathUnaffected"
      ],
      operatingEnvelope,
      scope
    });
  }

  const admittedTemplate = templateInputs.find(
    (template) =>
      template.deckId === scope.admittedTemplateDeckId &&
      template.familyId === scope.admittedTemplateFamilyId
  );

  if (!admittedTemplate) {
    await writeOutput(resolvedOutputPath, inputBuffer);
    return buildBlockedResult({
      candidateDeckId,
      inputAuditReport: candidateAuditReport,
      requestedClasses: scope.requestedClasses,
      blockedClasses: scope.requestedClasses.filter(
        (className) => className === "alignment" || className === "fontFamily"
      ),
      untouchedOutOfScopeClasses: scope.outOfScopeClasses,
      admittedTemplateDeckId: scope.admittedTemplateDeckId,
      admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
      templateMatchResult: scope.templateMatchResult,
      decisionReasons: [
        "templateAnchorResolutionFailed",
        "defaultCleanupPathUnaffected"
      ],
      operatingEnvelope,
      scope
    });
  }

  let currentBuffer = inputBuffer;
  const appliedClasses: Array<"alignment" | "fontFamily"> = [];
  const blockedClasses = new Set<TemplateEnforcementClass>();
  const decisionReasons = new Set<TemplateEnforcementCoreReason>([
    "defaultCleanupPathUnaffected"
  ]);
  const stageChangeCounts = {
    alignmentChanges: 0,
    fontFamilyChanges: 0
  };

  for (const requestedClass of scope.inScopeClasses) {
    if (requestedClass === "fontFamily") {
      const templateFontFamily = admittedTemplate.auditReport.deckStyleFingerprint.fontFamily;
      if (templateFontFamily === null) {
        blockedClasses.add("fontFamily");
        decisionReasons.add("templateFontFamilyTargetUnavailable");
        continue;
      }

      const archive = await JSZip.loadAsync(currentBuffer);
      const report = await applyFontFamilyFixToArchive(
        archive,
        candidatePresentation,
        templateFontFamily
      );
      const changeCount = countChangedEntries(report.changedRuns);

      if (changeCount > 0) {
        currentBuffer = await archive.generateAsync({ type: "nodebuffer" });
        stageChangeCounts.fontFamilyChanges += changeCount;
        appliedClasses.push("fontFamily");
      }
      continue;
    }

    const templateAlignment = admittedTemplate.auditReport.deckStyleFingerprint.alignment;
    if (templateAlignment === null) {
      blockedClasses.add("alignment");
      decisionReasons.add("templateAlignmentTargetUnavailable");
      continue;
    }

    const archive = await JSZip.loadAsync(currentBuffer);
    const report = await applyDominantBodyStyleFixToArchive(
      archive,
      candidatePresentation,
      buildAlignmentTargetAuditReport(candidateAuditReport, templateAlignment)
    );
    const alignmentOnly = report.changedParagraphs.every(
      (change) => change.property === "alignment"
    );
    const changeCount = alignmentOnly
      ? countChangedEntries(report.changedParagraphs)
      : 0;

    if (!alignmentOnly && report.changedParagraphs.length > 0) {
      blockedClasses.add("alignment");
      decisionReasons.add("alignmentStageProducedOutOfScopeChanges");
      continue;
    }

    if (changeCount > 0) {
      currentBuffer = await archive.generateAsync({ type: "nodebuffer" });
      stageChangeCounts.alignmentChanges += changeCount;
      appliedClasses.push("alignment");
    }
  }

  await writeOutput(resolvedOutputPath, currentBuffer);

  const outputAuditReport =
    appliedClasses.length > 0
      ? analyzeSlides(await loadPresentation(resolvedOutputPath))
      : candidateAuditReport;

  if (appliedClasses.length === 0) {
    decisionReasons.add("noSafeInScopeChanges");
    return buildNoopResult({
      candidateDeckId,
      inputAuditReport: candidateAuditReport,
      outputAuditReport,
      requestedClasses: scope.requestedClasses,
      blockedClasses: [...blockedClasses].sort((left, right) => left.localeCompare(right)),
      untouchedOutOfScopeClasses: scope.outOfScopeClasses,
      admittedTemplateDeckId: scope.admittedTemplateDeckId,
      admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
      templateMatchResult: scope.templateMatchResult,
      decisionReasons: [...decisionReasons],
      operatingEnvelope,
      scope
    });
  }

  return {
    enforcementName: "templateEnforcementCore",
    claimScope: "narrowAdmittedExternalTemplateEnforcementOnly",
    explicitTemplateInvocationRequired: true,
    defaultCleanupPathAffected: false,
    productTruthChanged: false,
    enforcementStatus: "enforcementApplied",
    candidateDeckId,
    requestedClasses: scope.requestedClasses,
    admittedTemplateDeckId: scope.admittedTemplateDeckId,
    admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
    templateMatchResult: scope.templateMatchResult,
    scopeDecision: scope.scopeDecision,
    appliedClasses,
    blockedClasses: [...blockedClasses].sort((left, right) => left.localeCompare(right)),
    untouchedOutOfScopeClasses: scope.outOfScopeClasses,
    stageChangeCounts,
    verification: {
      fontDriftBefore: candidateAuditReport.fontDrift.driftRuns.length,
      fontDriftAfter: outputAuditReport.fontDrift.driftRuns.length,
      alignmentDriftBefore: candidateAuditReport.alignmentDriftCount,
      alignmentDriftAfter: outputAuditReport.alignmentDriftCount
    },
    decisionReasons: [...decisionReasons],
    operatingEnvelope,
    scope,
    reportSummary: summarizeTemplateEnforcementReportSummary({
      enforcementStatus: "enforcementApplied",
      requestedClasses: scope.requestedClasses,
      admittedTemplateDeckId: scope.admittedTemplateDeckId,
      admittedTemplateFamilyId: scope.admittedTemplateFamilyId,
      templateMatchResult: scope.templateMatchResult,
      scopeDecision: scope.scopeDecision,
      appliedClasses,
      blockedClasses: [...blockedClasses].sort((left, right) => left.localeCompare(right)),
      untouchedOutOfScopeClasses: scope.outOfScopeClasses,
      decisionReasons: [...decisionReasons]
    }),
    summaryLine: "Template enforcement core applied a narrow admitted-template pass for currently in-scope classes only."
  };
}

function buildAlignmentTargetAuditReport(
  auditReport: AuditReport,
  templateAlignment: string
): AuditReport {
  const clonedAuditReport = structuredClone(auditReport);
  clonedAuditReport.deckStyleFingerprint.alignment = templateAlignment;
  clonedAuditReport.slides = clonedAuditReport.slides.map((slide) => ({
    ...slide,
    dominantBodyStyle: {
      ...slide.dominantBodyStyle,
      alignment: templateAlignment
    }
  }));
  return clonedAuditReport;
}

function buildBlockedResult(input: {
  candidateDeckId: string;
  inputAuditReport: AuditReport;
  requestedClasses: TemplateEnforcementClass[];
  blockedClasses: TemplateEnforcementClass[];
  untouchedOutOfScopeClasses: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent">;
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateMatchOperatingEnvelopeSummary["matchResult"];
  decisionReasons?: TemplateEnforcementCoreReason[];
  operatingEnvelope: TemplateMatchOperatingEnvelopeSummary;
  scope: TemplateEnforcementScopeSummary;
}): TemplateEnforcementCoreResult {
  const decisionReasons = input.decisionReasons ??
    (input.templateMatchResult === "ambiguousMatch"
      ? [
        "ambiguousTemplateMatchBlocked",
        "admittedExternalTemplateRequired",
        "defaultCleanupPathUnaffected"
      ]
      : [
        "rejectedTemplateMatchBlocked",
        "admittedExternalTemplateRequired",
        "defaultCleanupPathUnaffected"
      ]);

  return {
    enforcementName: "templateEnforcementCore",
    claimScope: "narrowAdmittedExternalTemplateEnforcementOnly",
    explicitTemplateInvocationRequired: true,
    defaultCleanupPathAffected: false,
    productTruthChanged: false,
    enforcementStatus: "enforcementBlocked",
    candidateDeckId: input.candidateDeckId,
    requestedClasses: input.requestedClasses,
    admittedTemplateDeckId: input.admittedTemplateDeckId,
    admittedTemplateFamilyId: input.admittedTemplateFamilyId,
    templateMatchResult: input.templateMatchResult,
    scopeDecision: input.scope.scopeDecision,
    appliedClasses: [],
    blockedClasses: input.blockedClasses,
    untouchedOutOfScopeClasses: input.untouchedOutOfScopeClasses,
    stageChangeCounts: {
      alignmentChanges: 0,
      fontFamilyChanges: 0
    },
    verification: {
      fontDriftBefore: input.inputAuditReport.fontDrift.driftRuns.length,
      fontDriftAfter: input.inputAuditReport.fontDrift.driftRuns.length,
      alignmentDriftBefore: input.inputAuditReport.alignmentDriftCount,
      alignmentDriftAfter: input.inputAuditReport.alignmentDriftCount
    },
    decisionReasons,
    operatingEnvelope: input.operatingEnvelope,
    scope: input.scope,
    reportSummary: summarizeTemplateEnforcementReportSummary({
      enforcementStatus: "enforcementBlocked",
      requestedClasses: input.requestedClasses,
      admittedTemplateDeckId: input.admittedTemplateDeckId,
      admittedTemplateFamilyId: input.admittedTemplateFamilyId,
      templateMatchResult: input.templateMatchResult,
      scopeDecision: input.scope.scopeDecision,
      appliedClasses: [],
      blockedClasses: input.blockedClasses,
      untouchedOutOfScopeClasses: input.untouchedOutOfScopeClasses,
      decisionReasons
    }),
    summaryLine: "Template enforcement core was blocked because admitted external-template preconditions were not satisfied."
  };
}

function buildNoopResult(input: {
  candidateDeckId: string;
  inputAuditReport: AuditReport;
  outputAuditReport?: AuditReport;
  requestedClasses: TemplateEnforcementClass[];
  blockedClasses: TemplateEnforcementClass[];
  untouchedOutOfScopeClasses: Array<"fontSize" | "lineSpacing" | "paragraphSpacing" | "bulletIndent">;
  admittedTemplateDeckId: string | null;
  admittedTemplateFamilyId: string | null;
  templateMatchResult: TemplateMatchOperatingEnvelopeSummary["matchResult"];
  decisionReasons: TemplateEnforcementCoreReason[];
  operatingEnvelope: TemplateMatchOperatingEnvelopeSummary;
  scope: TemplateEnforcementScopeSummary;
}): TemplateEnforcementCoreResult {
  const outputAuditReport = input.outputAuditReport ?? input.inputAuditReport;

  return {
    enforcementName: "templateEnforcementCore",
    claimScope: "narrowAdmittedExternalTemplateEnforcementOnly",
    explicitTemplateInvocationRequired: true,
    defaultCleanupPathAffected: false,
    productTruthChanged: false,
    enforcementStatus: "enforcementNoop",
    candidateDeckId: input.candidateDeckId,
    requestedClasses: input.requestedClasses,
    admittedTemplateDeckId: input.admittedTemplateDeckId,
    admittedTemplateFamilyId: input.admittedTemplateFamilyId,
    templateMatchResult: input.templateMatchResult,
    scopeDecision: input.scope.scopeDecision,
    appliedClasses: [],
    blockedClasses: input.blockedClasses,
    untouchedOutOfScopeClasses: input.untouchedOutOfScopeClasses,
    stageChangeCounts: {
      alignmentChanges: 0,
      fontFamilyChanges: 0
    },
    verification: {
      fontDriftBefore: input.inputAuditReport.fontDrift.driftRuns.length,
      fontDriftAfter: outputAuditReport.fontDrift.driftRuns.length,
      alignmentDriftBefore: input.inputAuditReport.alignmentDriftCount,
      alignmentDriftAfter: outputAuditReport.alignmentDriftCount
    },
    decisionReasons: input.decisionReasons,
    operatingEnvelope: input.operatingEnvelope,
    scope: input.scope,
    reportSummary: summarizeTemplateEnforcementReportSummary({
      enforcementStatus: "enforcementNoop",
      requestedClasses: input.requestedClasses,
      admittedTemplateDeckId: input.admittedTemplateDeckId,
      admittedTemplateFamilyId: input.admittedTemplateFamilyId,
      templateMatchResult: input.templateMatchResult,
      scopeDecision: input.scope.scopeDecision,
      appliedClasses: [],
      blockedClasses: input.blockedClasses,
      untouchedOutOfScopeClasses: input.untouchedOutOfScopeClasses,
      decisionReasons: input.decisionReasons
    }),
    summaryLine: "Template enforcement core produced a no-op because no requested class was safely enforceable inside the current narrow envelope."
  };
}

function countChangedEntries(entries: Array<{ count: number }>): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}

async function writeOutput(outputPath: string, buffer: Buffer): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}
