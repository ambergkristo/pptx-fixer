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
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-[var(--line-strong)] bg-[var(--surface-panel)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line-strong)] pb-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-dim)]">Workspace summary</p>
          <p className="mt-1 truncate text-[12px] text-[var(--text-soft)]" title={props.file ? "Review the audit, run cleanup, then download the corrected deck." : "Upload a PPTX to populate the workspace."}>
            {props.file ? "Review the audit, run cleanup, then download the corrected deck." : "Upload a PPTX to populate the workspace."}
          </p>
        </div>
        <StateBadge state={props.fixStatus === "loading" ? "loading" : props.auditStatus} />
      </div>

      <div className="mt-2 grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(250px,0.76fr)_minmax(320px,1.24fr)] lg:overflow-hidden">
        <article className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[var(--line-strong)] bg-[var(--surface-press)] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-dim)]">Audit summary</p>
              <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-strong)]">Deck state</h2>
            </div>
            <StateBadge state={props.auditStatus} />
          </div>

          {auditReady ? (
            <div className="mt-2 grid gap-1.5 overflow-hidden">
              <MetricRow label="Slides" value={String(props.auditSummary.slideCount)} tone="neutral" />
              <MetricRow label="Font drift" value={String(props.auditSummary.fontDrift)} suffix="slides" tone="success" />
              <MetricRow label="Size drift" value={String(props.auditSummary.fontSizeDrift)} suffix="slides" tone="warning" />
              <MetricRow label="Spacing drift" value={String(props.auditSummary.spacingDrift)} suffix="paragraphs" tone="warning" />
              <MetricRow label="Bullet drift" value={String(props.auditSummary.bulletIndentDriftCount)} suffix="paragraphs" tone="warning" />
              <MetricRow label="Line spacing" value={String(props.auditSummary.lineSpacingDriftCount)} suffix="paragraphs" tone="warning" />
            </div>
          ) : (
            <p className="mt-2 overflow-hidden text-[12px] leading-5 text-[var(--text-soft)]">
              {props.auditStatus === "loading"
                ? "Reading the uploaded deck."
                : props.file
                  ? "Audit summary will appear here when scanning finishes."
                  : "No audit data yet."}
            </p>
          )}
        </article>

        <article className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[var(--line-strong)] bg-[var(--surface-press)] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-dim)]">Cleanup result</p>
              <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-strong)]">Output</h2>
            </div>
            <StateBadge state={props.fixStatus} />
          </div>

          {fixReady ? (
            <div className="mt-2 grid min-h-0 gap-1.5 overflow-auto pr-0.5">
              <div className="grid gap-1.5 sm:grid-cols-3">
                <MetricTile label="Mode" value={props.fixResponse.report.mode} tone="neutral" />
                <MetricTile label="Changed" value={String(props.fixResponse.report.changesBySlide.length)} suffix="slides" tone="success" />
                <MetricTile label="Validation" value={validationPassed ? "Passed" : "Failed"} tone={validationPassed ? "success" : "danger"} />
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                <DeltaTile
                  label="Font drift"
                  before={props.fixResponse.report.verification.fontDriftBefore}
                  after={props.fixResponse.report.verification.fontDriftAfter}
                />
                <DeltaTile
                  label="Size drift"
                  before={props.fixResponse.report.verification.fontSizeDriftBefore}
                  after={props.fixResponse.report.verification.fontSizeDriftAfter}
                />
                <MetricTile label="Font changes" value={String(props.fixResponse.report.totals.fontFamilyChanges)} tone="success" />
                <MetricTile label="Size changes" value={String(props.fixResponse.report.totals.fontSizeChanges)} tone="neutral" />
              </div>
            </div>
          ) : (
            <p className="mt-2 overflow-hidden text-[12px] leading-5 text-[var(--text-soft)]">
              {props.fixStatus === "loading"
                ? "Preparing corrected PPTX."
                : "Run a cleanup pass to populate downloads and before/after results."}
            </p>
          )}
        </article>
      </div>

      <div className="mt-2 shrink-0 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line-strong)] pt-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">Downloads</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-soft)]" title="Corrected deck and JSON report stay available after a successful run.">
            Corrected deck and JSON report stay available after a successful run.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <a
            className={`inline-flex h-8 items-center justify-center rounded-[10px] border px-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
              fixReady
                ? "border-[var(--line-focus)] bg-[var(--accent-sand)] text-[#181512] hover:bg-[#e3d4b8]"
                : "pointer-events-none border-[var(--line-strong)] bg-[var(--surface-chip)] text-[var(--text-dim)]"
            }`}
            href={fixReady ? props.fixResponse.downloadUrl : undefined}
          >
            Download fixed PPTX
          </a>
          <button
            type="button"
            disabled={!fixReady}
            onClick={props.onDownloadReport}
            className="inline-flex h-8 items-center justify-center rounded-[10px] border border-[var(--line-focus)] bg-transparent px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)] transition hover:border-[var(--accent-sand)] hover:bg-[var(--surface-chip)] disabled:cursor-not-allowed disabled:border-[var(--line-strong)] disabled:text-[var(--text-dim)]"
          >
            Download report
          </button>
        </div>
      </div>

      {props.errorMessage && !props.file ? (
        <p className="mt-2 truncate text-[11px] text-[var(--accent-rose)]" title={props.errorMessage}>
          {props.errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function MetricRow(props: {
  label: string;
  value: string;
  suffix?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = resolveToneClass(props.tone);

  return (
    <div className="flex items-center justify-between gap-2 rounded-[11px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-2.5 py-2">
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">{props.label}</p>
      <p className={`truncate text-[13px] font-semibold ${toneClass}`}>
        {props.value}
        {props.suffix ? <span className="ml-1 text-[9px] uppercase tracking-[0.16em] text-[var(--text-dim)]">{props.suffix}</span> : null}
      </p>
    </div>
  );
}

function MetricTile(props: {
  label: string;
  value: string;
  suffix?: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = resolveToneClass(props.tone);

  return (
    <div className="rounded-[11px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">{props.label}</p>
      <p className={`mt-1 truncate text-[13px] font-semibold ${toneClass}`}>
        {props.value}
        {props.suffix ? <span className="ml-1 text-[9px] uppercase tracking-[0.16em] text-[var(--text-dim)]">{props.suffix}</span> : null}
      </p>
    </div>
  );
}

function DeltaTile(props: { label: string; before: number; after: number | null }) {
  return (
    <div className="rounded-[11px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">{props.label}</p>
      <p className="mt-1 truncate text-[13px] font-semibold text-[var(--text-primary)]">
        {props.before} <span className="text-[var(--text-dim)]">-&gt;</span> <span className="text-[var(--accent-mint)]">{props.after ?? "n/a"}</span>
      </p>
    </div>
  );
}

function StateBadge(props: { state: "idle" | "loading" | "success" | "error" }) {
  const toneClass =
    props.state === "success"
      ? "border-[rgba(155,231,176,0.28)] bg-[rgba(155,231,176,0.08)] text-[var(--accent-mint)]"
      : props.state === "loading"
        ? "border-[rgba(232,193,109,0.28)] bg-[rgba(232,193,109,0.08)] text-[var(--accent-amber)]"
        : props.state === "error"
          ? "border-[rgba(217,107,107,0.24)] bg-[rgba(217,107,107,0.08)] text-[var(--accent-rose)]"
          : "border-[var(--line-strong)] bg-[var(--surface-chip)] text-[var(--text-dim)]";

  return (
    <span className={`inline-flex h-6 items-center justify-center rounded-full border px-2 text-[9px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>
      {props.state}
    </span>
  );
}

function resolveToneClass(tone: "neutral" | "success" | "warning" | "danger"): string {
  if (tone === "success") {
    return "text-[var(--accent-mint)]";
  }

  if (tone === "warning") {
    return "text-[var(--accent-amber)]";
  }

  if (tone === "danger") {
    return "text-[var(--accent-rose)]";
  }

  return "text-[var(--accent-sand)]";
}
