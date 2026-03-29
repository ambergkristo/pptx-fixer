import { startTransition, useEffect, useState } from "react";

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
  const inlineStatus = resolveInlineStatus({
    file,
    auditStatus,
    fixStatus,
    errorMessage
  });

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

  function handleFileSelect(nextFile: File | null) {
    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!/\.pptx$/i.test(nextFile.name)) {
      setErrorMessage("Only .pptx files are supported.");
      return;
    }

    setErrorMessage(null);
    setFile(nextFile);
  }

  function handleInvalidFile(message: string) {
    setErrorMessage(message);
  }

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)] lg:h-[100dvh] lg:min-h-[100dvh] lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-3 py-3 lg:h-[100dvh] lg:min-h-0 lg:max-h-[100dvh] lg:px-4 lg:py-4">
        <header className="mb-2.5 flex items-center justify-between rounded-[16px] border border-[var(--line-strong)] bg-[var(--surface-raised)] px-3.5 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.26)]">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)]">
              <div className="relative h-4 w-4">
                <div className="absolute inset-y-0 left-0 w-[5px] rounded-full bg-[var(--accent-mint)]" />
                <div className="absolute inset-y-0 right-0 w-[5px] rounded-full bg-[var(--accent-sand)]" />
                <div className="absolute left-[4px] right-[4px] top-[4px] h-[6px] rounded-full bg-[var(--app-bg)]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-['Fraunces',serif] text-[22px] leading-none text-[var(--text-strong)]">CleanDeck</p>
                <span className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-press)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
                  Beta
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-[var(--text-soft)]">
                Strict cleanup for existing PowerPoint decks.
              </p>
            </div>
          </div>
          <p className="hidden text-[10px] uppercase tracking-[0.22em] text-[var(--text-dim)] lg:block">
            Audit. Normalize. Export.
          </p>
        </header>

        <div className="grid flex-1 gap-2.5 lg:min-h-0 lg:max-h-full lg:grid-cols-[312px_minmax(0,1fr)] lg:overflow-hidden">
          <UploadControlPanel
            file={file}
            mode={mode}
            statusText={inlineStatus.text}
            statusTone={inlineStatus.tone}
            errorMessage={errorMessage}
            isAuditing={auditStatus === "loading"}
            isFixing={fixStatus === "loading"}
            canRunFix={canRunFix}
            onFileChange={handleFileSelect}
            onInvalidFile={handleInvalidFile}
            onModeChange={setMode}
            onFix={handleFix}
          />

          <StatusPanel
            file={file}
            auditStatus={auditStatus}
            fixStatus={fixStatus}
            auditSummary={auditSummary}
            fixResponse={fixResponse}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </main>
  );
}

function resolveInlineStatus(props: {
  file: File | null;
  auditStatus: "idle" | "loading" | "success" | "error";
  fixStatus: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
}): { text: string; tone: "neutral" | "success" | "warning" | "danger" } {
  if (props.errorMessage) {
    return {
      text: props.errorMessage,
      tone: "danger"
    };
  }

  if (!props.file) {
    return {
      text: "Drop a PPTX or use the file picker.",
      tone: "neutral"
    };
  }

  if (props.auditStatus === "loading") {
    return {
      text: "Analyzing deck...",
      tone: "warning"
    };
  }

  if (props.fixStatus === "loading") {
    return {
      text: "Applying safe cleanup...",
      tone: "warning"
    };
  }

  if (props.fixStatus === "success") {
    return {
      text: "Fixed deck and report are ready.",
      tone: "success"
    };
  }

  if (props.auditStatus === "success") {
    return {
      text: "Audit ready. Review the summary and run cleanup.",
      tone: "success"
    };
  }

  return {
    text: "Select a valid PPTX file to continue.",
    tone: "neutral"
  };
}
