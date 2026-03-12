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
        setErrorMessage(message);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  async function handleFix() {
    if (!file) {
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6d9be_0%,rgba(246,217,190,0)_30%),radial-gradient(circle_at_bottom_right,#d7e4db_0%,rgba(215,228,219,0)_28%),linear-gradient(135deg,#f3ecde_0%,#efe3d3_48%,#eadac7_100%)] text-stone-900">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-6 md:px-6 md:py-10 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="relative">
          <div className="pointer-events-none absolute -left-8 top-10 hidden h-40 w-40 rounded-full border border-stone-400/30 md:block" />
          <UploadControlPanel
            file={file}
            mode={mode}
            isAuditing={auditStatus === "loading"}
            isFixing={fixStatus === "loading"}
            onFileChange={setFile}
            onModeChange={setMode}
            onFix={handleFix}
          />
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute inset-x-14 top-0 h-px bg-stone-400/30" />
          <div className="rounded-[2.2rem] border border-white/40 bg-[rgba(255,252,247,0.58)] p-4 shadow-[0_50px_120px_rgba(81,56,40,0.14)] backdrop-blur md:p-6">
            <div className="mb-6 flex flex-col gap-3 border-b border-stone-300/70 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.45em] text-stone-500">Product shell</p>
                <h2 className="mt-3 font-['Fraunces',serif] text-4xl text-stone-900 md:text-5xl">
                  Audit first. Clean second.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-stone-600">
                The browser shell talks only to the existing upload, audit, fix, and download endpoints. No new cleanup rules are introduced here.
              </p>
            </div>

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
      </div>
    </main>
  );
}
