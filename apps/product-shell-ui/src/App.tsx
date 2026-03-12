import { startTransition, useEffect, useMemo, useState } from "react";

import { StatusPanel } from "./components/StatusPanel";
import { UploadControlPanel } from "./components/UploadControlPanel";
import { uploadAudit, uploadFix, type AuditSummary, type CleanupMode, type FixResponse } from "./lib/api";

export function App() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<CleanupMode>("standard");
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [fixResponse, setFixResponse] = useState<FixResponse | null>(null);
  const [auditStatus, setAuditStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fixStatus, setFixStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canRunFix = Boolean(file) && auditStatus === "success" && fixStatus !== "loading";
  const statusMessage =
    auditStatus === "loading"
      ? "Analyzing..."
      : fixStatus === "loading"
        ? "Applying safe cleanup..."
        : fixStatus === "success"
          ? "Output ready"
          : auditStatus === "error" || fixStatus === "error"
            ? "Action required"
            : null;
  const reportFileName = useMemo(() => {
    if (!file) {
      return "cleandeck.report.json";
    }

    const baseName = file.name.replace(/\.pptx$/i, "");
    return `${baseName}-fixed.report.json`;
  }, [file]);

  useEffect(() => {
    if (!file) {
      setAuditSummary(null);
      setFixResponse(null);
      setAuditStatus("idle");
      setFixStatus("idle");
      setErrorMessage(null);
      return;
    }

    let cancelled = false;
    setAuditStatus("loading");
    setFixStatus("idle");
    setFixResponse(null);
    setErrorMessage(null);

    uploadAudit(file)
      .then((response) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setAuditSummary(response);
          setAuditStatus("success");
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setAuditStatus("error");
        setAuditSummary(null);
        setFixStatus("idle");
        setFixResponse(null);
        setErrorMessage(message);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  async function handleFix() {
    if (!file || !canRunFix) {
      return;
    }

    setFixStatus("loading");
    setFixResponse(null);
    setErrorMessage(null);

    try {
      const response = await uploadFix(file, mode);
      startTransition(() => {
        setFixResponse(response);
        setFixStatus("success");
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setFixStatus("error");
      setErrorMessage(message);
    }
  }

  function handleDownloadReport() {
    if (!fixResponse) {
      return;
    }

    const blob = new Blob([JSON.stringify(fixResponse.report, null, 2)], {
      type: "application/json"
    });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = reportFileName;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-[#f3f3f1]">
      <div className="mx-auto flex min-h-screen max-w-[1460px] flex-col px-4 py-4 lg:px-5 lg:py-5">
        <header className="mb-4 flex items-center justify-between rounded-[22px] border border-[#2a2a33] bg-[#111116] px-4 py-3 shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[14px] border border-[#2f313b] bg-[#171920]">
              <div className="relative h-5 w-5">
                <div className="absolute inset-y-0 left-0 w-[7px] rounded-full bg-[#9be7b0]" />
                <div className="absolute inset-y-0 right-0 w-[7px] rounded-full bg-[#d7c4a1]" />
                <div className="absolute left-[6px] right-[6px] top-[6px] h-[8px] rounded-full bg-[#0b0b0f]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-['Fraunces',serif] text-[26px] leading-none text-[#f7f7f2]">CleanDeck</p>
                <span className="rounded-full border border-[#2f313b] bg-[#181920] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b7b7c2]">
                  Beta
                </span>
              </div>
              <p className="mt-1 text-sm text-[#b7b7c2]">
                Precision cleanup for existing PowerPoint decks.
              </p>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <UploadControlPanel
            file={file}
            mode={mode}
            isAuditing={auditStatus === "loading"}
            isFixing={fixStatus === "loading"}
            canRunFix={canRunFix}
            onFileChange={setFile}
            onModeChange={setMode}
            onFix={handleFix}
          />

          <StatusPanel
            file={file}
            statusMessage={statusMessage}
            auditStatus={auditStatus}
            fixStatus={fixStatus}
            auditSummary={auditSummary}
            fixResponse={fixResponse}
            errorMessage={errorMessage}
            onDownloadReport={handleDownloadReport}
          />
        </div>
      </div>
    </main>
  );
}
