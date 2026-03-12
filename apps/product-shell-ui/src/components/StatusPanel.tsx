import type { AuditSummary, FixResponse } from "../lib/api";

interface StatusPanelProps {
  file: File | null;
  auditStatus: "idle" | "loading" | "success" | "error";
  fixStatus: "idle" | "loading" | "success" | "error";
  auditSummary: AuditSummary | null;
  fixResponse: FixResponse | null;
  errorMessage: string | null;
  onDownloadReport: () => void;
}

export function StatusPanel(props: StatusPanelProps) {
  const auditReady = props.auditStatus === "success" && props.auditSummary;
  const fixReady = props.fixStatus === "success" && props.fixResponse;
  const validationPassed = Boolean(fixReady && Object.values(props.fixResponse.report.validation).every(Boolean));

  return (
    <section className="grid h-full gap-4 rounded-[22px] border border-[#2a2a33] bg-[#141418] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <article className="rounded-[18px] border border-[#2a2a33] bg-[#1b1b21] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d8d9a]">Audit summary</p>
              <h2 className="mt-2 text-xl font-semibold text-[#f3f3f1]">Current deck state</h2>
            </div>
            <StateBadge state={props.auditStatus} />
          </div>

          {auditReady ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <MetricCard label="Slides" value={String(props.auditSummary.slideCount)} tone="neutral" />
              <MetricCard label="Font drift" value={`${props.auditSummary.fontDrift}`} suffix="slides" tone="success" />
              <MetricCard label="Size drift" value={`${props.auditSummary.fontSizeDrift}`} suffix="slides" tone="warning" />
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#b7b7c2]">
              {props.auditStatus === "loading"
                ? "Reading the uploaded deck and summarizing drift."
                : props.file
                  ? "Audit will appear here after the API finishes scanning the file."
                  : "Upload a PPTX to see its audit summary."}
            </p>
          )}
        </article>

        <article className="rounded-[18px] border border-[#2a2a33] bg-[#1b1b21] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d8d9a]">Progress</p>
              <h2 className="mt-2 text-xl font-semibold text-[#f3f3f1]">Workspace status</h2>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <ProgressRow
              label="Audit loaded"
              state={props.auditStatus}
              helper="Deck metadata and drift summary."
            />
            <ProgressRow
              label="Cleanup run"
              state={props.fixStatus}
              helper="Selected normalization mode."
            />
            <ProgressRow
              label="Output ready"
              state={fixReady ? "success" : props.fixStatus === "loading" ? "loading" : "idle"}
              helper="Corrected PPTX and report package."
            />
          </div>
        </article>
      </div>

      <article className="rounded-[18px] border border-[#2a2a33] bg-[#1b1b21] p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d8d9a]">Result</p>
            <h2 className="mt-2 text-xl font-semibold text-[#f3f3f1]">Cleanup outcome</h2>
            <p className="mt-1 text-sm text-[#b7b7c2]">
              Compact verification and export controls for the last successful run.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className={`inline-flex items-center justify-center rounded-[12px] border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                fixReady
                  ? "border-[#2f313b] bg-[#d7c4a1] text-[#181512] hover:bg-[#dfd0b4]"
                  : "pointer-events-none border-[#2a2a33] bg-[#23252d] text-[#6f7280]"
              }`}
              href={fixReady ? props.fixResponse.downloadUrl : undefined}
            >
              Download fixed PPTX
            </a>
            <button
              type="button"
              disabled={!fixReady}
              onClick={props.onDownloadReport}
              className="inline-flex items-center justify-center rounded-[12px] border border-[#2f313b] bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#d0d1da] transition hover:border-[#4a4d58] hover:bg-[#202129] disabled:cursor-not-allowed disabled:border-[#2a2a33] disabled:text-[#6f7280]"
            >
              Download report
            </button>
          </div>
        </div>

        {fixReady ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-3">
              <MetricCard label="Mode" value={props.fixResponse.report.mode} tone="neutral" />
              <MetricCard label="Changed slides" value={String(props.fixResponse.report.changesBySlide.length)} tone="success" />
              <MetricCard label="Validation" value={validationPassed ? "Passed" : "Failed"} tone={validationPassed ? "success" : "danger"} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <DeltaCard
                label="Font drift"
                before={props.fixResponse.report.verification.fontDriftBefore}
                after={props.fixResponse.report.verification.fontDriftAfter}
              />
              <DeltaCard
                label="Size drift"
                before={props.fixResponse.report.verification.fontSizeDriftBefore}
                after={props.fixResponse.report.verification.fontSizeDriftAfter}
              />
              <MetricCard label="Font changes" value={String(props.fixResponse.report.totals.fontFamilyChanges)} tone="success" />
              <MetricCard label="Size changes" value={String(props.fixResponse.report.totals.fontSizeChanges)} tone="neutral" />
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-[#b7b7c2]">
            {props.fixStatus === "loading"
              ? "Building the corrected deck and validating the output."
              : "Run a cleanup pass to unlock downloads and before/after verification."}
          </p>
        )}

        {props.errorMessage ? (
          <div className="mt-4 rounded-[14px] border border-[#7b4141] bg-[#2a181b] px-4 py-3 text-sm text-[#d96b6b]">
            {props.errorMessage}
          </div>
        ) : null}
      </article>
    </section>
  );
}

function MetricCard(props: {
  label: string;
  value: string;
  suffix?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass =
    props.tone === "success"
      ? "text-[#9be7b0]"
      : props.tone === "warning"
        ? "text-[#e8c16d]"
        : props.tone === "danger"
          ? "text-[#d96b6b]"
          : "text-[#d7c4a1]";

  return (
    <div className="rounded-[14px] border border-[#2a2a33] bg-[#141419] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d8d9a]">{props.label}</p>
      <p className={`mt-2 text-xl font-semibold ${toneClass}`}>
        {props.value}
        {props.suffix ? <span className="ml-1 text-xs font-medium uppercase tracking-[0.18em] text-[#7e8190]">{props.suffix}</span> : null}
      </p>
    </div>
  );
}

function ProgressRow(props: {
  label: string;
  state: "idle" | "loading" | "success" | "error";
  helper: string;
}) {
  return (
    <div className="grid grid-cols-[94px_minmax(0,1fr)] items-center gap-3 rounded-[14px] border border-[#2a2a33] bg-[#141419] px-3 py-3">
      <StateBadge state={props.state} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#f3f3f1]">{props.label}</p>
        <p className="mt-0.5 truncate text-xs text-[#8f90a0]">{props.helper}</p>
      </div>
    </div>
  );
}

function DeltaCard(props: { label: string; before: number; after: number | null }) {
  return (
    <div className="rounded-[14px] border border-[#2a2a33] bg-[#141419] px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8d8d9a]">{props.label}</p>
      <p className="mt-2 text-lg font-semibold text-[#f3f3f1]">
        {props.before} <span className="text-[#6f7280]">→</span> <span className="text-[#9be7b0]">{props.after ?? "n/a"}</span>
      </p>
    </div>
  );
}

function StateBadge(props: { state: "idle" | "loading" | "success" | "error" }) {
  const toneClass =
    props.state === "success"
      ? "border-[#2e5a3b] bg-[#15231a] text-[#9be7b0]"
      : props.state === "loading"
        ? "border-[#66522f] bg-[#231d13] text-[#e8c16d]"
        : props.state === "error"
          ? "border-[#6d3535] bg-[#251617] text-[#d96b6b]"
          : "border-[#323541] bg-[#181920] text-[#8f90a0]";

  return (
    <span className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${toneClass}`}>
      {props.state}
    </span>
  );
}
