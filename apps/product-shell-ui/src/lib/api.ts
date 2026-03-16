export type CleanupMode = "minimal" | "standard";

export interface AuditSummary {
  slideCount: number;
  fontDrift: number;
  fontSizeDrift: number;
  spacingDrift: number;
  bulletIndentDriftCount: number;
  lineSpacingDriftCount: number;
  alignmentDriftCount: number;
}

export interface FixReport {
  mode: CleanupMode;
  applied: boolean;
  noOp: boolean;
  steps: Array<{
    name: "fontFamilyFix" | "fontSizeFix";
    changedRuns: number;
  }>;
  totals: {
    fontFamilyChanges: number;
    fontSizeChanges: number;
  };
  changesBySlide: Array<{
    slide: number;
    fontFamilyChanges: number;
    fontSizeChanges: number;
  }>;
  validation: {
    outputExists: boolean;
    isZip: boolean;
    coreEntriesPresent: boolean;
    reloadable: boolean;
    slideCountMatches: boolean;
  };
  verification: {
    inputSlideCount: number;
    outputSlideCount: number | null;
    fontDriftBefore: number;
    fontDriftAfter: number | null;
    fontSizeDriftBefore: number;
    fontSizeDriftAfter: number | null;
  };
}

export interface FixResponse {
  report: FixReport;
  downloadUrl: string;
}

export async function uploadAudit(file: File): Promise<AuditSummary> {
  const formData = new FormData();
  formData.append("file", file);
  return sendMultipartRequest<AuditSummary>("/audit", formData);
}

export async function uploadFix(file: File, mode: CleanupMode): Promise<FixResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);
  return sendMultipartRequest<FixResponse>("/fix", formData);
}

async function sendMultipartRequest<T>(endpoint: string, formData: FormData): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: string };
    return payload.error ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}
