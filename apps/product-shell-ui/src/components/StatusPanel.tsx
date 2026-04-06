import type { AuditSummary, FixResponse } from "../lib/api";
import { UploadResultScreenBoundary } from "./UploadResultScreenBoundary.ts";
import { buildUploadResultViewModel } from "../lib/uploadResultViewModel.ts";

interface StatusPanelProps {
  file: File | null;
  mode: "minimal" | "standard" | "normalize" | "template";
  auditStatus: "idle" | "loading" | "success" | "error";
  fixStatus: "idle" | "loading" | "success" | "error";
  auditSummary: AuditSummary | null;
  fixResponse: FixResponse | null;
  errorMessage: string | null;
  fixedPptxAction: {
    state: "hidden" | "ready" | "attention" | "blocked";
    href: string | null;
    fileName: string | null;
    message: string | null;
  };
}

export function StatusPanel(props: StatusPanelProps) {
  const auditReady = props.auditStatus === "success" && props.auditSummary;
  const fixReady = props.fixStatus === "success" && props.fixResponse;
  const uploadResultViewModel = fixReady
    ? buildUploadResultViewModel(props.fixResponse.report)
    : null;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[16px] border border-[var(--line-strong)] bg-[var(--surface-panel)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <div className="border-b border-[var(--line-strong)] pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-dim)]">Workspace summary</p>
          <p className="mt-1 truncate text-[12px] text-[var(--text-soft)]" title={props.file ? "Review the audit summary and repair result." : "Upload a PPTX to populate the workspace."}>
            {props.file ? "Review the audit summary and repair result." : "Upload a PPTX to populate the workspace."}
          </p>
        </div>
          <div className="flex shrink-0 items-center gap-2">
            {renderActionSurface(props)}
            <StateBadge state={props.fixStatus === "loading" ? "loading" : props.auditStatus} />
          </div>
        </div>

        {props.fixedPptxAction.message ? (
          <p
            className={`mt-2 text-[11px] ${
              props.fixedPptxAction.state === "blocked" || props.fixedPptxAction.state === "attention"
                ? "text-[var(--accent-rose)]"
                : "text-[var(--accent-mint)]"
            }`}
            title={props.fixedPptxAction.message}
          >
            {props.fixedPptxAction.message}
          </p>
        ) : null}

        {(props.fixedPptxAction.state === "ready" || props.fixedPptxAction.state === "attention") && props.fixedPptxAction.fileName ? (
          <p className="mt-1 truncate text-[10px] text-[var(--text-dim)]" title={props.fixedPptxAction.fileName}>
            {props.fixedPptxAction.fileName}
          </p>
        ) : null}
      </div>

      <div className="mt-2 grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(250px,0.76fr)_minmax(320px,1.24fr)]">
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
              <MetricRow label="Alignment drift" value={String(props.auditSummary.alignmentDriftCount)} suffix="paragraphs" tone="warning" />
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-dim)]">Repair result</p>
              <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-strong)]">Before / after</h2>
            </div>
            <StateBadge state={props.fixStatus} />
          </div>

          <UploadResultScreenBoundary viewModel={uploadResultViewModel} />
        </article>
      </div>

      {props.errorMessage && !props.file ? (
        <p className="mt-2 truncate text-[11px] text-[var(--accent-rose)]" title={props.errorMessage}>
          {props.errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function renderActionSurface(props: StatusPanelProps) {
  if (props.fixedPptxAction.state === "ready" && props.fixedPptxAction.href) {
    return (
      <button
        type="button"
        data-fixed-pptx-action="ready"
        onClick={() => window.location.assign(props.fixedPptxAction.href!)}
        className="inline-flex h-9 items-center justify-center rounded-[10px] bg-[var(--accent-mint)] px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a0b0d] [font-family:'IBM_Plex_Sans',sans-serif] transition hover:bg-[#b4efc3]"
      >
        {props.mode === "template" ? "Download templated deck" : "Download normalized deck"}
      </button>
    );
  }

  if (props.fixedPptxAction.state === "attention" && props.fixedPptxAction.href) {
    return (
      <button
        type="button"
        data-fixed-pptx-action="attention"
        onClick={() => window.location.assign(props.fixedPptxAction.href!)}
        className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[rgba(217,107,107,0.36)] bg-[rgba(217,107,107,0.14)] px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-rose)] [font-family:'IBM_Plex_Sans',sans-serif] transition hover:bg-[rgba(217,107,107,0.2)]"
      >
        {props.mode === "template" ? "Download templated deck" : "Download normalized deck"}
      </button>
    );
  }

  if (props.fixedPptxAction.state === "blocked") {
    return (
      <span className="inline-flex h-9 items-center justify-center rounded-[10px] border border-[rgba(217,107,107,0.36)] bg-[rgba(217,107,107,0.14)] px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-rose)]">
        Download unavailable
      </span>
    );
  }

  return null;
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
